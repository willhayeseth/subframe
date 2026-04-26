import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowDownUp, Loader2, CheckCircle, ExternalLink, AlertCircle, ChevronDown } from "lucide-react";
import { useAccount, useReadContract, useWriteContract, useSendTransaction, useWaitForTransactionReceipt } from "wagmi";
import { useAppKit } from "@reown/appkit/react";
import { parseAbi, parseEther, parseUnits } from "viem";
import { getBaseUrl } from "@workspace/api-client-react";

const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as const;
const UNIVERSAL_ROUTER = "0x66a9893cc07d91d95644aedd05d03f95e1dba8af" as const;
const MAX_UINT256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
const MAX_UINT160 = BigInt("0xffffffffffffffffffffffffffffffffffffffff");
const MAX_UINT48 = 281474976710655n;

const ERC20_ABI = parseAbi([
  "function allowance(address,address) view returns (uint256)",
  "function approve(address,uint256) returns (bool)",
  "function balanceOf(address) view returns (uint256)",
]);

const PERMIT2_ABI = parseAbi([
  "function allowance(address,address,address) view returns (uint160 amount, uint48 expiration, uint48 nonce)",
  "function approve(address token, address spender, uint160 amount, uint48 expiration)",
]);

export interface TradeModalProps {
  open: boolean;
  onClose: () => void;
  tokenAddress: string;
  tokenSymbol: string;
  subdomainName: string;
  defaultTab?: "buy" | "sell";
}

export function TradeModal({
  open,
  onClose,
  tokenAddress,
  tokenSymbol,
  subdomainName,
  defaultTab = "buy",
}: TradeModalProps) {
  const [tab, setTab] = useState<"buy" | "sell">(defaultTab);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [pendingAction, setPendingAction] = useState<"none" | "approve_erc20" | "approve_permit2" | "swap">("none");

  const { address: userAddress, isConnected } = useAccount();
  const { open: openWalletModal } = useAppKit();
  const baseUrl = getBaseUrl() || (typeof window !== "undefined" ? `${window.location.protocol}//${window.location.host}` : "");
  const tokenAddr = tokenAddress as `0x${string}`;

  useEffect(() => {
    if (!open) {
      setAmount("");
      setError(null);
      setTxHash(undefined);
      setPendingAction("none");
    }
    setTab(defaultTab);
  }, [open, defaultTab]);

  const amountWei = (() => {
    try {
      const n = parseFloat(amount);
      if (isNaN(n) || n <= 0) return null;
      return tab === "buy" ? parseEther(amount) : parseUnits(amount, 18);
    } catch { return null; }
  })();

  const { data: tokenBalance, refetch: refetchBalance } = useReadContract({
    address: tokenAddr,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress && !!tokenAddress && open,
      refetchInterval: open ? 12000 : false,
    },
  });

  const { data: erc20Allowance, refetch: refetchErc20Allow } = useReadContract({
    address: tokenAddr,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: userAddress ? [userAddress, PERMIT2] : undefined,
    query: { enabled: tab === "sell" && !!userAddress && !!tokenAddress && open },
  });

  const { data: permit2Data, refetch: refetchPermit2Allow } = useReadContract({
    address: PERMIT2,
    abi: PERMIT2_ABI,
    functionName: "allowance",
    args: userAddress ? [userAddress, tokenAddr, UNIVERSAL_ROUTER] : undefined,
    query: { enabled: tab === "sell" && !!userAddress && !!tokenAddress && open },
  });

  const { writeContract, isPending: isWritePending } = useWriteContract();
  const { sendTransaction, isPending: isSendPending } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (isConfirmed) {
      refetchBalance();
      refetchErc20Allow();
      refetchPermit2Allow();
    }
  }, [isConfirmed]);

  const tokenBalanceStr = tokenBalance !== undefined
    ? (Number((tokenBalance as bigint) / 10n ** 18n) + Number(((tokenBalance as bigint) % 10n ** 18n) * 10000n / 10n ** 18n) / 10000).toFixed(4)
    : isConnected ? "..." : "0";

  const permit2Amount = permit2Data ? (permit2Data as unknown as [bigint, bigint, bigint])[0] : 0n;
  const permit2Expiry = permit2Data ? (permit2Data as unknown as [bigint, bigint, bigint])[1] : 0n;
  const nowTs = BigInt(Math.floor(Date.now() / 1000));

  const needsErc20Approve = tab === "sell" && amountWei !== null && (erc20Allowance as bigint | undefined) !== undefined && (erc20Allowance as bigint) < amountWei;
  const needsPermit2Approve = tab === "sell" && !needsErc20Approve && amountWei !== null && (
    permit2Amount < amountWei || permit2Expiry < nowTs
  );
  const canSwap = isConnected && amountWei !== null && !needsErc20Approve && !needsPermit2Approve;

  const isLoading = isWritePending || isSendPending || isConfirming;

  const handleApproveErc20 = () => {
    setError(null);
    setPendingAction("approve_erc20");
    writeContract(
      { address: tokenAddr, abi: ERC20_ABI, functionName: "approve", args: [PERMIT2, MAX_UINT256] },
      {
        onSuccess: (hash) => {
          setTxHash(hash);
          setTimeout(() => { refetchErc20Allow(); setPendingAction("none"); }, 3000);
        },
        onError: (e) => { setError(e.message.slice(0, 150)); setPendingAction("none"); },
      }
    );
  };

  const handleApprovePermit2 = () => {
    setError(null);
    setPendingAction("approve_permit2");
    writeContract(
      {
        address: PERMIT2,
        abi: PERMIT2_ABI,
        functionName: "approve",
        args: [tokenAddr, UNIVERSAL_ROUTER, MAX_UINT160, Number(MAX_UINT48)],
      },
      {
        onSuccess: (hash) => {
          setTxHash(hash);
          setTimeout(() => { refetchPermit2Allow(); setPendingAction("none"); }, 3000);
        },
        onError: (e) => { setError(e.message.slice(0, 150)); setPendingAction("none"); },
      }
    );
  };

  const handleSwap = async () => {
    if (!amountWei) return;
    setError(null);
    setPendingAction("swap");
    try {
      const res = await fetch(
        `${baseUrl}/api/subdomains/${subdomainName}/trade-calldata?type=${tab}&amountIn=${amountWei.toString()}`
      );
      if (!res.ok) throw new Error("Failed to fetch swap calldata");
      const data = await res.json();
      sendTransaction(
        { to: data.to, data: data.calldata, value: tab === "buy" ? amountWei : 0n },
        {
          onSuccess: (hash) => {
            setTxHash(hash);
            setPendingAction("none");
          },
          onError: (e) => { setError(e.message.slice(0, 150)); setPendingAction("none"); },
        }
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to get calldata");
      setPendingAction("none");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.96 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-sm rounded-2xl bg-[#111] border border-white/[0.08] shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/[0.05]">
              <div>
                <div className="text-sm font-black text-white">${tokenSymbol}</div>
                <div className="text-xs text-white/25 font-mono">{subdomainName}.subframe.eth · Uniswap V4</div>
              </div>
              <button onClick={onClose} className="p-1.5 rounded-lg border border-white/[0.06] text-white/30 hover:text-white/70 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.05]">
                {(["buy", "sell"] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setAmount(""); setError(null); setTxHash(undefined); setPendingAction("none"); }}
                    className={`flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all ${tab === t ? "bg-[#CBFF4D] text-[#0C0C0C]" : "text-white/30 hover:text-white/60"}`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {!isConnected && (
                <button
                  onClick={() => openWalletModal()}
                  className="w-full rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-xs text-amber-400 font-mono text-center hover:bg-amber-500/20 hover:border-amber-500/40 transition-all cursor-pointer"
                >
                  Connect your wallet to trade →
                </button>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-white/35 font-mono uppercase tracking-widest">
                    {tab === "buy" ? "You pay" : "You sell"}
                  </span>
                  {tab === "sell" && isConnected && (
                    <button
                      onClick={() => { setAmount(tokenBalanceStr); setError(null); }}
                      className="text-[10px] text-[#CBFF4D]/50 hover:text-[#CBFF4D] transition-colors font-mono"
                    >
                      Balance: {tokenBalanceStr} {tokenSymbol}
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="number" step="any" min="0"
                    value={amount}
                    onChange={e => { setAmount(e.target.value); setError(null); setTxHash(undefined); }}
                    placeholder={tab === "buy" ? "0.001" : "1.0"}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white font-mono text-sm placeholder:text-white/20 focus:outline-none focus:border-[#CBFF4D]/30 transition-colors"
                  />
                  <div className="px-3 py-3 rounded-xl bg-white/[0.03] border border-white/[0.08] text-white/40 text-sm font-mono shrink-0 flex items-center gap-1.5">
                    <ChevronDown className="w-3 h-3" />
                    {tab === "buy" ? "ETH" : tokenSymbol}
                  </div>
                </div>
              </div>

              {amountWei && tab === "buy" && (
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] text-white/20 font-mono">Est. receive</span>
                  <span className="text-[10px] text-white/40 font-mono">
                    ~{(Number(amountWei) / 1e18 * 992).toFixed(2)} {tokenSymbol}
                  </span>
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-2.5">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-red-400 font-mono break-all">{error}</span>
                </div>
              )}

              {txHash && isConfirmed && !isConfirming && (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-3 py-2.5">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-xs text-emerald-400 font-mono">Transaction confirmed!</span>
                  <a
                    href={`https://etherscan.io/tx/${txHash}`}
                    target="_blank" rel="noopener noreferrer"
                    className="ml-auto text-emerald-400/50 hover:text-emerald-400 transition-colors"
                    onClick={e => e.stopPropagation()}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}

              {tab === "sell" && isConnected && amountWei && (
                <div className="space-y-2">
                  {needsErc20Approve && (
                    <button
                      onClick={handleApproveErc20}
                      disabled={isLoading}
                      className="w-full py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm font-bold hover:bg-white/[0.1] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {pendingAction === "approve_erc20" && isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Step 1: Approve {tokenSymbol}
                    </button>
                  )}
                  {needsPermit2Approve && (
                    <button
                      onClick={handleApprovePermit2}
                      disabled={isLoading}
                      className="w-full py-3 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white text-sm font-bold hover:bg-white/[0.1] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {pendingAction === "approve_permit2" && isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Step 2: Allow Permit2
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={canSwap ? handleSwap : undefined}
                disabled={!canSwap || isLoading || (tab === "sell" && (needsErc20Approve || needsPermit2Approve))}
                className="w-full py-3.5 rounded-xl bg-[#CBFF4D] text-[#0C0C0C] text-sm font-black hover:bg-[#CBFF4D]/90 transition-all disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {pendingAction === "swap" && isLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />{isConfirming ? "Confirming..." : "Pending..."}</>
                ) : (
                  <><ArrowDownUp className="w-4 h-4" />{tab === "buy" ? `Buy ${tokenSymbol}` : `Sell ${tokenSymbol}`}</>
                )}
              </button>

              <div className="text-[10px] text-white/10 text-center font-mono">
                Routed through Uniswap V4 · {subdomainName}.subframe.eth
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
