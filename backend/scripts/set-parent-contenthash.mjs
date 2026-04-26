#!/usr/bin/env node
/**
 * Standalone script to set the ENS contenthash on subframe.eth to a given IPFS CID.
 * Run from workspace root:
 *   node artifacts/api-server/scripts/set-parent-contenthash.mjs <CID>
 *
 * Requires ENS_PRIVATE_KEY env var to be set.
 */

import { createPublicClient, createWalletClient, http, namehash } from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { CID } from "multiformats/cid";

const CID_ARG = process.argv[2];
if (!CID_ARG) {
  console.error("Usage: node set-parent-contenthash.mjs <IPFS_CID>");
  process.exit(1);
}

const RAW_KEY = process.env["ENS_PRIVATE_KEY"];
if (!RAW_KEY) {
  console.error("ENS_PRIVATE_KEY env var not set");
  process.exit(1);
}

const ENS_REGISTRY   = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e";
const PUBLIC_RESOLVER = "0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63";
const PARENT_NODE    = namehash("subframe.eth");

const DEFAULT_RPC = "https://eth.drpc.org";
const BACKUP_RPCS = [
  "https://eth.drpc.org",
  "https://ethereum.publicnode.com",
  "https://rpc.ankr.com/eth",
  "https://1rpc.io/eth",
];

const ENS_REGISTRY_ABI = [
  {
    name: "resolver",
    type: "function",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    name: "setResolver",
    type: "function",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "resolver", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
];

const RESOLVER_ABI = [
  {
    name: "setContenthash",
    type: "function",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "hash", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "contenthash",
    type: "function",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "bytes" }],
    stateMutability: "view",
  },
];

function cidToContentHash(cidStr) {
  const cid = CID.parse(cidStr);
  const cidV1Bytes = cid.toV1().bytes;
  // 0xe3 0x01 = varint-encoded multicodec for ipfs-ns (227)
  const bytes = new Uint8Array([0xe3, 0x01, ...cidV1Bytes]);
  return `0x${Buffer.from(bytes).toString("hex")}`;
}

async function main() {
  const privateKey = RAW_KEY.startsWith("0x") ? RAW_KEY : `0x${RAW_KEY}`;
  const account = privateKeyToAccount(privateKey);

  console.log(`[ENS] Wallet address: ${account.address}`);
  console.log(`[ENS] Target CID: ${CID_ARG}`);
  console.log(`[ENS] RPC: ${DEFAULT_RPC}`);

  const transport = http(DEFAULT_RPC);
  const publicClient = createPublicClient({ chain: mainnet, transport });
  const walletClient = createWalletClient({ account, chain: mainnet, transport });

  // Check chain ID
  const chainId = await publicClient.getChainId();
  console.log(`[ENS] Chain ID: ${chainId} (expected 1)`);
  if (chainId !== 1) {
    console.error(`ERROR: Wrong chain! Expected mainnet (1), got ${chainId}`);
    process.exit(1);
  }

  // Step 1: Check current resolver on subframe.eth
  const currentResolver = await publicClient.readContract({
    address: ENS_REGISTRY,
    abi: ENS_REGISTRY_ABI,
    functionName: "resolver",
    args: [PARENT_NODE],
  });
  console.log(`[ENS] Current resolver: ${currentResolver}`);

  const feeData = await publicClient.estimateFeesPerGas();
  const maxPriorityFeePerGas = BigInt(2_000_000_000); // 2 gwei
  const maxFeePerGas = (feeData.maxFeePerGas ?? BigInt(10_000_000_000)) * 2n + maxPriorityFeePerGas;
  console.log(`[ENS] maxFeePerGas: ${Number(maxFeePerGas) / 1e9} gwei`);

  if (currentResolver.toLowerCase() !== PUBLIC_RESOLVER.toLowerCase()) {
    console.log(`[ENS] Switching resolver to PUBLIC_RESOLVER (${PUBLIC_RESOLVER})...`);
    const setResolverTx = await walletClient.writeContract({
      address: ENS_REGISTRY,
      abi: ENS_REGISTRY_ABI,
      functionName: "setResolver",
      args: [PARENT_NODE, PUBLIC_RESOLVER],
      maxFeePerGas,
      maxPriorityFeePerGas,
    });
    console.log(`[ENS] setResolver TX: ${setResolverTx}`);
    console.log(`[ENS] Waiting for confirmation...`);
    await publicClient.waitForTransactionReceipt({ hash: setResolverTx, timeout: 10 * 60 * 1000 });
    console.log(`[ENS] Resolver updated.`);
  } else {
    console.log(`[ENS] Resolver already set to PUBLIC_RESOLVER — skipping setResolver.`);
  }

  // Step 2: Set contenthash
  const contenthash = cidToContentHash(CID_ARG);
  console.log(`[ENS] Computed contenthash: ${contenthash}`);

  // Re-fetch fee data for fresh estimate
  const feeData2 = await publicClient.estimateFeesPerGas();
  const mfpg2 = (feeData2.maxFeePerGas ?? BigInt(10_000_000_000)) * 2n + maxPriorityFeePerGas;

  console.log(`[ENS] Sending setContenthash on subframe.eth...`);
  const txHash = await walletClient.writeContract({
    address: PUBLIC_RESOLVER,
    abi: RESOLVER_ABI,
    functionName: "setContenthash",
    args: [PARENT_NODE, contenthash],
    maxFeePerGas: mfpg2,
    maxPriorityFeePerGas,
  });

  console.log(`[ENS] TX submitted: ${txHash}`);
  console.log(`[ENS] Track on Etherscan: https://etherscan.io/tx/${txHash}`);
  console.log(`[ENS] Waiting for confirmation...`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 10 * 60 * 1000 });
  console.log(`[ENS] Confirmed in block ${receipt.blockNumber}, status: ${receipt.status}`);

  if (receipt.status === "success") {
    console.log(`\n✅ SUCCESS — subframe.eth now points to ipfs://${CID_ARG}`);
    console.log(`   eth.limo will propagate within ~5-10 minutes.`);
    console.log(`   Check: https://subframe.eth.limo`);
  } else {
    console.error(`\n❌ TX REVERTED — check Etherscan for details`);
    console.error(`   https://etherscan.io/tx/${txHash}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`[ENS] Fatal error:`, err);
  process.exit(1);
});
