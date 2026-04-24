import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  encodeFunctionData,
  type Address,
} from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { ART_TOKEN_BYTECODE, ART_TOKEN_ABI } from "../contracts/ArtToken.js";
import { logger } from "./logger.js";

const UNISWAP_V2_FACTORY = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f" as Address;
const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D" as Address;
const WETH = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2" as Address;

const PROTOCOL_TREASURY = (process.env["PROTOCOL_TREASURY"] ?? "0x0000000000000000000000000000000000000000") as Address;

const INITIAL_TOKEN_SUPPLY = 1_000_000n;
const INITIAL_ETH_LIQUIDITY = parseEther("0.05");

const UNISWAP_FACTORY_ABI = [
  {
    name: "createPair",
    type: "function",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    outputs: [{ name: "pair", type: "address" }],
    stateMutability: "nonpayable",
  },
  {
    name: "getPair",
    type: "function",
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
    ],
    outputs: [{ name: "pair", type: "address" }],
    stateMutability: "view",
  },
] as const;

const UNISWAP_ROUTER_ABI = [
  {
    name: "addLiquidityETH",
    type: "function",
    inputs: [
      { name: "token", type: "address" },
      { name: "amountTokenDesired", type: "uint256" },
      { name: "amountTokenMin", type: "uint256" },
      { name: "amountETHMin", type: "uint256" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    outputs: [
      { name: "amountToken", type: "uint256" },
      { name: "amountETH", type: "uint256" },
      { name: "liquidity", type: "uint256" },
    ],
    stateMutability: "payable",
  },
] as const;

const ERC20_APPROVE_ABI = [
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

const RPCS = [
  process.env["ETH_RPC_URL"] ?? "https://eth.drpc.org",
  "https://eth.drpc.org",
  "https://ethereum.publicnode.com",
  "https://rpc.ankr.com/eth",
];

function getClients() {
  const rawKey = process.env["ENS_PRIVATE_KEY"] ?? "";
  if (!rawKey) throw new Error("ENS_PRIVATE_KEY not set");

  const key = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const account = privateKeyToAccount(key);

  const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(RPCS[0]),
  });

  const walletClient = createWalletClient({
    account,
    chain: mainnet,
    transport: http(RPCS[0]),
  });

  return { account, publicClient, walletClient };
}

async function waitForTx(publicClient: ReturnType<typeof createPublicClient>, hash: `0x${string}`, label: string): Promise<void> {
  logger.info(`[TOKEN] Waiting for ${label}: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
  if (receipt.status !== "success") {
    throw new Error(`Transaction ${hash} reverted (${label})`);
  }
  logger.info(`[TOKEN] ${label} confirmed in block ${receipt.blockNumber}`);
}

export interface DeployArtTokenResult {
  tokenAddress: Address;
  tokenTxHash: `0x${string}`;
  pairAddress: Address;
  liquidityTxHash: `0x${string}`;
}

export async function deployArtToken(params: {
  subdomainName: string;
  creatorWallet: Address;
  tokenName: string;
  tokenSymbol: string;
}): Promise<DeployArtTokenResult> {
  const { subdomainName, creatorWallet, tokenName, tokenSymbol } = params;

  if (!process.env["ENS_PRIVATE_KEY"]) {
    throw new Error("ENS_PRIVATE_KEY not set — cannot deploy token");
  }

  const { account, publicClient, walletClient } = getClients();
  const treasury = PROTOCOL_TREASURY !== "0x0000000000000000000000000000000000000000"
    ? PROTOCOL_TREASURY
    : account.address;

  logger.info(`[TOKEN] Deploying ${tokenName} (${tokenSymbol}) for ${subdomainName}.subframe.eth`);
  logger.info(`[TOKEN] Creator: ${creatorWallet}, Treasury: ${treasury}`);

  const PRIORITY_FEE = BigInt(3_000_000_000);
  const feeData = await publicClient.estimateFeesPerGas();
  const maxFeePerGas = (feeData.maxFeePerGas ?? BigInt(20_000_000_000)) + PRIORITY_FEE;

  const tokenTxHash = await walletClient.deployContract({
    abi: ART_TOKEN_ABI,
    bytecode: ART_TOKEN_BYTECODE,
    args: [tokenName, tokenSymbol, INITIAL_TOKEN_SUPPLY, creatorWallet, treasury],
    maxFeePerGas,
    maxPriorityFeePerGas: PRIORITY_FEE,
  });
  logger.info(`[TOKEN] Deploy tx: ${tokenTxHash}`);

  await waitForTx(publicClient, tokenTxHash, "token deploy");

  const deployReceipt = await publicClient.getTransactionReceipt({ hash: tokenTxHash });
  const tokenAddress = deployReceipt.contractAddress;
  if (!tokenAddress) throw new Error("Token deployment failed — no contract address in receipt");
  logger.info(`[TOKEN] Contract deployed at: ${tokenAddress}`);

  const totalTokens = INITIAL_TOKEN_SUPPLY * (10n ** 18n);
  const tokensForLiquidity = totalTokens / 2n;

  logger.info(`[TOKEN] Approving Uniswap V2 Router to spend tokens...`);
  const approveTxHash = await walletClient.writeContract({
    address: tokenAddress,
    abi: ERC20_APPROVE_ABI,
    functionName: "approve",
    args: [UNISWAP_V2_ROUTER, tokensForLiquidity],
    maxFeePerGas,
    maxPriorityFeePerGas: PRIORITY_FEE,
  });
  await waitForTx(publicClient, approveTxHash, "approve router");

  const balance = await publicClient.getBalance({ address: account.address });
  logger.info(`[TOKEN] Backend wallet ETH balance: ${balance} wei`);

  if (balance < INITIAL_ETH_LIQUIDITY) {
    throw new Error(`Insufficient ETH for liquidity. Have ${balance} wei, need ${INITIAL_ETH_LIQUIDITY} wei`);
  }

  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);

  logger.info(`[TOKEN] Adding liquidity: ${tokensForLiquidity} tokens + ${INITIAL_ETH_LIQUIDITY} ETH`);
  const liquidityTxHash = await walletClient.writeContract({
    address: UNISWAP_V2_ROUTER,
    abi: UNISWAP_ROUTER_ABI,
    functionName: "addLiquidityETH",
    args: [
      tokenAddress,
      tokensForLiquidity,
      0n,
      0n,
      account.address,
      deadline,
    ],
    value: INITIAL_ETH_LIQUIDITY,
    maxFeePerGas,
    maxPriorityFeePerGas: PRIORITY_FEE,
  });
  logger.info(`[TOKEN] Liquidity tx: ${liquidityTxHash}`);
  await waitForTx(publicClient, liquidityTxHash, "add liquidity");

  const pairAddress = await publicClient.readContract({
    address: UNISWAP_V2_FACTORY,
    abi: UNISWAP_FACTORY_ABI,
    functionName: "getPair",
    args: [tokenAddress, WETH],
  }) as Address;

  logger.info(`[TOKEN] Uniswap V2 pair: ${pairAddress}`);
  logger.info(`[TOKEN] DONE: ${tokenSymbol} token live on Uniswap V2`);

  return {
    tokenAddress,
    tokenTxHash,
    pairAddress,
    liquidityTxHash,
  };
}

export function buildTokenMeta(subdomainName: string): { tokenName: string; tokenSymbol: string } {
  const clean = subdomainName.replace(/[^a-z0-9]/g, "");
  const upper = clean.toUpperCase();
  const tokenName = `${clean.charAt(0).toUpperCase()}${clean.slice(1)} Art`;
  const tokenSymbol = upper.length <= 6 ? upper : upper.slice(0, 6);
  return { tokenName, tokenSymbol };
}
