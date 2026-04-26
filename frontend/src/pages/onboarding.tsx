import { useEffect, useState } from "react";
import { useParams, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CheckCircle, Loader2, Terminal, ExternalLink, Zap } from "lucide-react";
import { useGetSubdomainByName, getGetSubdomainByNameQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { Subdomain } from "@workspace/api-client-react";

/* ── contract ───────────────────────────────────────────── */
const ENS_REVERSE_REGISTRAR = "0xa58E81fe9b61B5c3fE2AFD33CF304c454AbFc7Cb" as const;

const REVERSE_ABI = [
  {
    name: "setName",
    type: "function",
    inputs: [{ name: "name", type: "string" }],
    outputs: [{ name: "node", type: "bytes32" }],
    stateMutability: "nonpayable",
  },
] as const;

/* ── types ─────────────────────────────────────────────── */
type SubdomainWithTx = Subdomain & {
  ensTx1Hash?: string | null;
  ensTx2Hash?: string | null;
  ensTx3Hash?: string | null;
  ensTx4Hash?: string | null;
};

type StepState = "done" | "waiting" | "pending";
interface RegStep { label: string; detail?: string; txHash?: string | null; state: StepState; }

function buildSteps(sub: SubdomainWithTx): RegStep[] {
  const isActive = sub.status === "active" || sub.status === "linked";
  const tx1 = sub.ensTx1Hash;
  const tx2 = sub.ensTx2Hash;
  const tx3 = sub.ensTx3Hash;
  const tx4 = sub.ensTx4Hash;
  return [
    { label: "Wallet verified", detail: `${sub.walletAddress.slice(0, 10)}...`, state: "done" },
    { label: "IPFS profile page generated", state: isActive ? "done" : "pending" },
    { label: "Deployed to Pinata IPFS", detail: sub.ipfsCid ? `${sub.ipfsCid.slice(0, 12)}...` : undefined, state: isActive ? "done" : "pending" },
    { label: "ENS setSubnodeRecord", txHash: tx1, state: tx1 ? "done" : isActive ? "waiting" : "pending" },
    { label: "ENS setContenthash", txHash: tx2, state: tx2 ? "done" : tx1 ? "waiting" : "pending" },
    { label: "ENS setAddr", txHash: tx3, state: tx3 ? "done" : tx2 ? "waiting" : "pending" },
    { label: "Ownership transferred to you", txHash: tx4, state: tx4 ? "done" : tx3 ? "waiting" : "pending" },
  ];
}

function TxLink({ hash }: { hash: string }) {
  return (
    <a href={`https://etherscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer"
      className="ml-1.5 font-mono text-[#CBFF4D]/40 hover:text-[#CBFF4D]/80 transition-colors inline-flex items-center gap-0.5 group">
      {hash.slice(0, 10)}...
      <ExternalLink className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </a>
  );
}

export default function Onboarding() {
  const { name } = useParams<{ name: string }>();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  /* poll every 4s until linked */
  const { data } = useGetSubdomainByName(name ?? "", {
    query: {
      enabled: !!name,
      queryKey: getGetSubdomainByNameQueryKey(name ?? ""),
      refetchInterval: (q) => (q.state.data?.status === "linked" ? false : 4000),
    },
  });

  const sub = data as SubdomainWithTx | undefined;
  const isLinked = sub?.status === "linked";

  /* single TX: setName (primary ENS name) */
  const {
    writeContract: writeName,
    data: nameTxHash,
    isPending: nameSigning,
    error: nameError,
  } = useWriteContract();

  const { isSuccess: nameConfirmed, isLoading: nameWaiting } = useWaitForTransactionReceipt({ hash: nameTxHash });
  const [done, setDone] = useState(false);
  const [txTimeout, setTxTimeout] = useState(false);

  useEffect(() => {
    if (nameConfirmed && !done) {
      setDone(true);
      qc.invalidateQueries({ queryKey: getGetSubdomainByNameQueryKey(name ?? "") });
      setTimeout(() => setLocation(`/profile/${name}`), 800);
    }
  }, [nameConfirmed, done, name, setLocation, qc]);

  // Fallback: if receipt confirmation is stuck, show "Continue" after 18s
  useEffect(() => {
    if (!nameTxHash || done) return;
    const t = setTimeout(() => setTxTimeout(true), 18000);
    return () => clearTimeout(t);
  }, [nameTxHash, done]);

  const handleSetName = () => {
    if (!sub) return;
    writeName({
      address: ENS_REVERSE_REGISTRAR,
      abi: REVERSE_ABI,
      functionName: "setName",
      args: [sub.ensFullName],
    });
  };

  const handleSkip = () => setLocation(`/profile/${name}`);
  const busy = nameSigning || nameWaiting;

  if (!sub) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[70vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#CBFF4D]" />
      </div>
    );
  }

  const steps = buildSteps(sub);
  const doneCount = steps.filter((s) => s.state === "done").length;
  const progress = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="flex-1 bg-[#0C0C0C] flex flex-col items-center justify-center px-4 py-12 min-h-[80vh]">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative w-16 h-16 mx-auto mb-5">
            <div className="absolute inset-0 rounded-full bg-[#CBFF4D]/10 animate-pulse" />
            <div className="w-16 h-16 rounded-full bg-[#CBFF4D]/8 border border-[#CBFF4D]/25 flex items-center justify-center">
              {done ? (
                <CheckCircle className="w-8 h-8 text-[#CBFF4D]" />
              ) : (
                <Zap className="w-8 h-8 text-[#CBFF4D] fill-[#CBFF4D]" />
              )}
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white mb-2">
            {!isLinked ? "Setting up your identity" : done ? "All done" : "One last step"}
          </h1>
          <p className="font-mono text-[#CBFF4D] text-sm">{sub.ensFullName}</p>
          {!isLinked && (
            <div className="mt-4 w-full bg-white/[0.06] rounded-full h-1.5 overflow-hidden">
              <motion.div
                className="h-full bg-[#CBFF4D] rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
          )}
        </div>

        {/* Registration log */}
        <div className="rounded-xl border border-white/[0.06] bg-[#080808] overflow-hidden mb-6">
          <div className="px-4 py-2.5 border-b border-white/[0.05] flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-[#CBFF4D]/50" />
            <span className="text-xs font-mono text-white/30 uppercase tracking-wider">Registration Log</span>
            <div className="ml-auto flex items-center gap-1.5 font-mono text-xs">
              {isLinked ? (
                <><div className="w-1.5 h-1.5 rounded-full bg-[#CBFF4D]" /><span className="text-[#CBFF4D]/70">complete</span></>
              ) : (
                <><Loader2 className="w-3 h-3 text-amber-400/60 animate-spin" /><span className="text-amber-400/70">processing</span></>
              )}
            </div>
          </div>
          <div className="p-4 space-y-2.5">
            {steps.map((step, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }} className="flex items-start gap-2.5 font-mono text-xs">
                {step.state === "done" ? (
                  <CheckCircle className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${i === steps.length - 1 ? "text-[#CBFF4D]" : "text-[#CBFF4D]/40"}`} />
                ) : step.state === "waiting" ? (
                  <Loader2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400/60 animate-spin" />
                ) : (
                  <div className="w-3.5 h-3.5 shrink-0 mt-0.5 rounded-full border border-white/10 flex items-center justify-center">
                    <div className="w-1 h-1 rounded-full bg-white/15" />
                  </div>
                )}
                <span className={step.state === "done" ? (i === steps.length - 1 ? "text-[#CBFF4D]/80" : "text-white/40") : step.state === "waiting" ? "text-amber-400/50" : "text-white/15"}>
                  {step.label}
                  {step.detail && <span className="ml-1.5 text-white/20">{step.detail}</span>}
                  {step.txHash && step.state === "done" && <TxLink hash={step.txHash} />}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Final step — only when backend done */}
        <AnimatePresence mode="wait">
          {isLinked && !done && (
            <motion.div key="primary"
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.35 }}
              className="rounded-xl border border-[#CBFF4D]/20 bg-[#CBFF4D]/[0.03] p-5"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="shrink-0 w-7 h-7 rounded-full bg-[#CBFF4D]/10 border border-[#CBFF4D]/25 flex items-center justify-center mt-0.5">
                  <span className="text-xs font-black text-[#CBFF4D]">1</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white mb-1">Set as Primary ENS Name</p>
                  <p className="text-xs text-white/40 leading-relaxed">
                    Makes <span className="font-mono text-[#CBFF4D]/60">{sub.ensFullName}</span> appear next to your address on Etherscan, Rainbow, MetaMask, and all Web3 apps. One transaction, signed from your wallet.
                  </p>
                </div>
              </div>

              {nameError && (
                <p className="text-xs text-red-400/70 mb-3 font-mono bg-red-400/5 rounded-lg px-3 py-2 truncate">
                  {nameError.message.slice(0, 100)}
                </p>
              )}

              {txTimeout ? (
                <>
                  <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-lg bg-[#CBFF4D]/5 border border-[#CBFF4D]/15">
                    <CheckCircle className="w-3.5 h-3.5 text-[#CBFF4D]/60 shrink-0" />
                    <span className="text-xs text-white/50 font-mono">
                      Transaction sent. <a href={`https://etherscan.io/tx/${nameTxHash}`} target="_blank" rel="noopener noreferrer" className="text-[#CBFF4D]/60 hover:text-[#CBFF4D] underline underline-offset-2">view on Etherscan</a>
                    </span>
                  </div>
                  <button
                    onClick={() => setLocation(`/profile/${name}`)}
                    className="w-full flex items-center justify-center gap-2 py-3.5 btn-lime rounded-xl text-sm font-black text-black"
                  >
                    <CheckCircle className="w-4 h-4" />Continue to Profile
                  </button>
                </>
              ) : (
                <button
                  onClick={handleSetName}
                  disabled={busy}
                  className="w-full flex items-center justify-center gap-2 py-3.5 btn-lime rounded-xl text-sm font-black text-black disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {nameSigning
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Waiting for wallet...</>
                    : nameWaiting
                    ? <><Loader2 className="w-4 h-4 animate-spin" />Confirming on-chain...</>
                    : <><CheckCircle className="w-4 h-4" />Set as Primary Name</>}
                </button>
              )}

              <button
                onClick={handleSkip}
                disabled={busy && !txTimeout}
                className="w-full mt-3 text-xs text-white/25 hover:text-white/50 transition-colors disabled:opacity-30"
              >
                Skip for now, go to profile
              </button>
            </motion.div>
          )}

          {done && (
            <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center py-4">
              <CheckCircle className="w-10 h-10 text-[#CBFF4D] mx-auto mb-2" />
              <p className="text-sm font-bold text-white">{sub.ensFullName} is fully live</p>
              <p className="text-xs text-white/40 mt-1">Redirecting to your profile...</p>
            </motion.div>
          )}

          {!isLinked && (
            <motion.div key="waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center mt-2">
              <p className="text-xs text-white/20 font-mono">Takes 2 to 5 minutes. You can close this tab and come back.</p>
              <button onClick={handleSkip}
                className="mt-3 text-xs text-white/25 hover:text-white/50 transition-colors underline underline-offset-2">
                Go to profile (registration still running)
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
