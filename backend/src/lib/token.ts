import {
  createWalletClient,
  createPublicClient,
  http,
  decodeEventLog,
  type Address,
} from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { ART_PROTOCOL_BYTECODE, ART_PROTOCOL_ABI } from "../contracts/SubframeArtProtocol.js";
import { logger } from "./logger.js";

const RPCS = [
  process.env["ETH_RPC_URL"] ?? "https://eth.drpc.org",
  "https://eth.drpc.org",
  "https://ethereum.publicnode.com",
  "https://rpc.ankr.com/eth",
];

const PROTOCOL_TREASURY = (process.env["PROTOCOL_TREASURY"] ?? "0x0000000000000000000000000000000000000000") as Address;
const ART_PROTOCOL_ADDRESS_ENV = (process.env["ART_PROTOCOL_ADDRESS"] ?? "") as Address;

function getClients() {
  const rawKey = process.env["ENS_PRIVATE_KEY"] ?? "";
  if (!rawKey) throw new Error("ENS_PRIVATE_KEY not set");
  const key = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const account = privateKeyToAccount(key);
  const publicClient = createPublicClient({ chain: mainnet, transport: http(RPCS[0]) });
  const walletClient = createWalletClient({ account, chain: mainnet, transport: http(RPCS[0]) });
  return { account, publicClient, walletClient };
}

async function waitForTx(publicClient: ReturnType<typeof createPublicClient>, hash: `0x${string}`, label: string) {
  logger.info(`[TOKEN] Waiting for ${label}: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
  if (receipt.status !== "success") throw new Error(`Transaction ${hash} reverted (${label})`);
  logger.info(`[TOKEN] ${label} confirmed in block ${receipt.blockNumber}`);
  return receipt;
}

export interface DeployArtTokenResult {
  contractAddress: Address;
  artTokenId: string;
  createTxHash: `0x${string}`;
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
  metadataUri?: string;
}): Promise<DeployArtTokenResult> {
  const { creatorWallet, metadataUri } = params;

  if (!process.env["ENS_PRIVATE_KEY"]) throw new Error("ENS_PRIVATE_KEY not set");

  const { account, publicClient, walletClient } = getClients();
  const treasury = PROTOCOL_TREASURY !== "0x0000000000000000000000000000000000000000"
    ? PROTOCOL_TREASURY
    : account.address;

  const PRIORITY_FEE = BigInt(3_000_000_000);
  const feeData = await publicClient.estimateFeesPerGas();
  const maxFeePerGas = (feeData.maxFeePerGas ?? BigInt(20_000_000_000)) + PRIORITY_FEE;

  let contractAddress: Address;

  if (ART_PROTOCOL_ADDRESS_ENV && ART_PROTOCOL_ADDRESS_ENV !== "0x" && ART_PROTOCOL_ADDRESS_ENV.length === 42) {
    contractAddress = ART_PROTOCOL_ADDRESS_ENV;
    logger.info(`[TOKEN] Using existing SubframeArtProtocol at ${contractAddress}`);
  } else {
    logger.info(`[TOKEN] Deploying SubframeArtProtocol contract (one-time setup)...`);
    const deployHash = await walletClient.deployContract({
      abi: ART_PROTOCOL_ABI,
      bytecode: ART_PROTOCOL_BYTECODE,
      args: [treasury],
      maxFeePerGas,
      maxPriorityFeePerGas: PRIORITY_FEE,
    });
    const deployReceipt = await waitForTx(publicClient, deployHash, "contract deploy");
    if (!deployReceipt.contractAddress) throw new Error("Contract deploy failed");
    contractAddress = deployReceipt.contractAddress;
    logger.info(`[TOKEN] SubframeArtProtocol deployed at ${contractAddress}`);
    logger.warn(`[TOKEN] Set ART_PROTOCOL_ADDRESS=${contractAddress} in env to skip re-deploy next time`);
  }

  const uri = metadataUri ?? `ipfs://subframe/${params.subdomainName}`;
  logger.info(`[TOKEN] Calling createArt for ${creatorWallet}`);

  const createTxHash = await walletClient.writeContract({
    address: contractAddress,
    abi: ART_PROTOCOL_ABI,
    functionName: "createArt",
    args: [creatorWallet, uri],
    maxFeePerGas,
    maxPriorityFeePerGas: PRIORITY_FEE,
  });

  const createReceipt = await waitForTx(publicClient, createTxHash, "createArt");

  let artTokenId = "0";
  for (const log of createReceipt.logs) {
    try {
      const decoded = decodeEventLog({ abi: ART_PROTOCOL_ABI, data: log.data, topics: log.topics });
      if (decoded.eventName === "ArtCreated") {
        artTokenId = String((decoded.args as { tokenId: bigint }).tokenId);
        break;
      }
    } catch { /* skip non-matching logs */ }
  }

  logger.info(`[TOKEN] Art created: tokenId=${artTokenId} contract=${contractAddress}`);

  return {
    contractAddress,
    artTokenId,
    createTxHash,
    tokenAddress: contractAddress,
    tokenTxHash: createTxHash,
    pairAddress: "0x0000000000000000000000000000000000000000" as Address,
    liquidityTxHash: createTxHash,
  };
}

export function buildTokenMeta(subdomainName: string): { tokenName: string; tokenSymbol: string } {
  const clean = subdomainName.replace(/[^a-z0-9]/g, "");
  const upper = clean.toUpperCase();
  const tokenName = `${clean.charAt(0).toUpperCase()}${clean.slice(1)} Art`;
  const tokenSymbol = upper.length <= 6 ? upper : upper.slice(0, 6);
  return { tokenName, tokenSymbol };
}
