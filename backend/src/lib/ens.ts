import {
  createWalletClient,
  createPublicClient,
  http,
  namehash,
  keccak256,
  toBytes,
  type Address,
} from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { CID } from "multiformats/cid";

const ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as Address;
const NAME_WRAPPER = "0xD4416b431e1a1A3893e2E4b9F26B5A4b57B35B0C" as Address;
const PUBLIC_RESOLVER = "0x231b0Ee14048e9dCcD1d247744d114a4EB5E8E63" as Address;
const PARENT_NODE = namehash("subframe.eth");
const DEFAULT_RPC = "https://eth.drpc.org";

const NAME_WRAPPER_ABI = [
  {
    name: "ownerOf",
    type: "function",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    name: "setSubnodeRecord",
    type: "function",
    inputs: [
      { name: "parentNode", type: "bytes32" },
      { name: "label", type: "string" },
      { name: "owner", type: "address" },
      { name: "resolver", type: "address" },
      { name: "ttl", type: "uint64" },
      { name: "fuses", type: "uint32" },
      { name: "expiry", type: "uint64" },
    ],
    outputs: [{ name: "node", type: "bytes32" }],
    stateMutability: "nonpayable",
  },
  {
    name: "safeTransferFrom",
    type: "function",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "id", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "data", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

const REGISTRY_ABI = [
  {
    name: "owner",
    type: "function",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    name: "setSubnodeRecord",
    type: "function",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "label", type: "bytes32" },
      { name: "owner", type: "address" },
      { name: "resolver", type: "address" },
      { name: "ttl", type: "uint64" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "setOwner",
    type: "function",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "owner", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

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
    name: "setAddr",
    type: "function",
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "a", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

function cidToContentHash(cidStr: string): `0x${string}` {
  const cid = CID.parse(cidStr);
  const cidV1Bytes = cid.toV1().bytes;
  // 0xe3 0x01 = varint-encoded multicodec for ipfs-ns (227)
  const bytes = new Uint8Array([0xe3, 0x01, ...cidV1Bytes]);
  return `0x${Buffer.from(bytes).toString("hex")}` as `0x${string}`;
}

export async function fixContenthash(name: string, ipfsCid: string): Promise<string | null> {
  const rawKey = process.env["ENS_PRIVATE_KEY"];
  if (!rawKey) return null;
  const privateKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;

  // Always use public RPC for write operations — avoids dRPC key propagation issues
  const rpcUrl = DEFAULT_RPC;
  console.log(`[ENS:fix] Using RPC: ${rpcUrl}`);

  const account = privateKeyToAccount(privateKey);
  const transport = http(rpcUrl);
  const publicClient = createPublicClient({ chain: mainnet, transport });
  const walletClient = createWalletClient({ account, chain: mainnet, transport });

  const subnameNode = namehash(`${name}.subframe.eth`);
  const contenthash = cidToContentHash(ipfsCid);

  // Get current base fee and set explicit gas params (2x base fee + 2 gwei priority)
  const feeData = await publicClient.estimateFeesPerGas();
  const maxPriorityFeePerGas = BigInt(2_000_000_000); // 2 gwei
  const maxFeePerGas = (feeData.maxFeePerGas ?? BigInt(10_000_000_000)) * 2n + maxPriorityFeePerGas;

  console.log(`[ENS:fix] Correcting contenthash for ${name}.subframe.eth`);
  console.log(`[ENS:fix] CID: ${ipfsCid} → ${contenthash}`);
  console.log(`[ENS:fix] maxFeePerGas: ${maxFeePerGas / BigInt(1e9)}gwei`);

  const txHash = await walletClient.writeContract({
    address: PUBLIC_RESOLVER,
    abi: RESOLVER_ABI,
    functionName: "setContenthash",
    args: [subnameNode, contenthash],
    maxFeePerGas,
    maxPriorityFeePerGas,
  });

  console.log(`[ENS:fix] TX: ${txHash}, waiting...`);
  await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 10 * 60 * 1000 });
  console.log(`[ENS:fix] Done — ${name}.subframe.eth contenthash corrected`);
  return txHash;
}

export async function fixSetAddr(name: string, userWallet: string): Promise<string | null> {
  const rawKey = process.env["ENS_PRIVATE_KEY"];
  if (!rawKey) return null;
  const privateKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const rpcUrl = DEFAULT_RPC;

  const account = privateKeyToAccount(privateKey);
  const transport = http(rpcUrl);
  const publicClient = createPublicClient({ chain: mainnet, transport });
  const walletClient = createWalletClient({ account, chain: mainnet, transport });

  const subnameNode = namehash(`${name}.subframe.eth`);

  const feeData = await publicClient.estimateFeesPerGas();
  const maxPriorityFeePerGas = BigInt(2_000_000_000);
  const maxFeePerGas = (feeData.maxFeePerGas ?? BigInt(10_000_000_000)) * 2n + maxPriorityFeePerGas;

  console.log(`[ENS:setAddr] Setting addr for ${name}.subframe.eth -> ${userWallet}`);
  const txHash = await walletClient.writeContract({
    address: PUBLIC_RESOLVER,
    abi: RESOLVER_ABI,
    functionName: "setAddr",
    args: [subnameNode, userWallet as Address],
    maxFeePerGas,
    maxPriorityFeePerGas,
  });

  console.log(`[ENS:setAddr] TX: ${txHash}, waiting...`);
  await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 10 * 60 * 1000 });
  console.log(`[ENS:setAddr] Done — addr set for ${name}.subframe.eth`);
  return txHash;
}

export async function transferSubdomainOwnership(name: string, userWallet: string): Promise<string | null> {
  const rawKey = process.env["ENS_PRIVATE_KEY"];
  if (!rawKey) return null;
  const privateKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const rpcUrl = DEFAULT_RPC;

  const account = privateKeyToAccount(privateKey);
  const transport = http(rpcUrl);
  const publicClient = createPublicClient({ chain: mainnet, transport });
  const walletClient = createWalletClient({ account, chain: mainnet, transport });

  const subnameNode = namehash(`${name}.subframe.eth`);

  let isWrapped = false;
  try {
    const tokenOwner = await publicClient.readContract({
      address: NAME_WRAPPER,
      abi: NAME_WRAPPER_ABI,
      functionName: "ownerOf",
      args: [BigInt(PARENT_NODE)],
    });
    isWrapped = tokenOwner !== "0x0000000000000000000000000000000000000000";
  } catch { /* assume unwrapped */ }

  const feeData = await publicClient.estimateFeesPerGas();
  const maxPriorityFeePerGas = BigInt(2_000_000_000);
  const maxFeePerGas = (feeData.maxFeePerGas ?? BigInt(10_000_000_000)) * 2n + maxPriorityFeePerGas;

  let txHash: `0x${string}`;
  if (isWrapped) {
    console.log(`[ENS:transfer] NameWrapper.safeTransferFrom ${name}.subframe.eth -> ${userWallet}`);
    txHash = await walletClient.writeContract({
      address: NAME_WRAPPER,
      abi: NAME_WRAPPER_ABI,
      functionName: "safeTransferFrom",
      args: [account.address, userWallet as Address, BigInt(subnameNode), 1n, "0x"],
      maxFeePerGas,
      maxPriorityFeePerGas,
    });
  } else {
    console.log(`[ENS:transfer] Registry.setOwner ${name}.subframe.eth -> ${userWallet}`);
    txHash = await walletClient.writeContract({
      address: ENS_REGISTRY,
      abi: REGISTRY_ABI,
      functionName: "setOwner",
      args: [subnameNode, userWallet as Address],
      maxFeePerGas,
      maxPriorityFeePerGas,
    });
  }

  console.log(`[ENS:transfer] TX: ${txHash}, waiting...`);
  await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 10 * 60 * 1000 });
  console.log(`[ENS:transfer] Done — ${name}.subframe.eth ownership transferred to ${userWallet}`);
  return txHash;
}

export type EnsStepCallback = (step: 1 | 2 | 3 | 4, txHash: string) => Promise<void>;

export async function registerSubdomainOnChain(
  name: string,
  userWallet: string,
  ipfsCid: string,
  onStep?: EnsStepCallback
): Promise<{ txHash: string } | null> {
  const rawKey = process.env["ENS_PRIVATE_KEY"];
  if (!rawKey) {
    console.warn("[ENS] ENS_PRIVATE_KEY not set, skipping on-chain registration");
    return null;
  }

  const privateKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;

  // ETH_RPC_URL can be a full URL or a bare Alchemy/Infura API key
  const rawRpc = process.env["ETH_RPC_URL"] ?? "";
  let rpcUrl: string;
  if (!rawRpc) {
    rpcUrl = DEFAULT_RPC;
    console.warn("[ENS] ETH_RPC_URL not set, using free public RPC (may be slow/unreliable)");
  } else if (rawRpc.startsWith("http")) {
    rpcUrl = rawRpc;
  } else {
    // Bare API key — assume dRPC (matches DEFAULT_RPC provider)
    rpcUrl = `https://lb.drpc.org/ogrpc?network=ethereum&dkey=${rawRpc}`;
    console.log("[ENS] ETH_RPC_URL looks like a bare key, constructed dRPC URL");
  }

  let account: ReturnType<typeof privateKeyToAccount>;
  try {
    account = privateKeyToAccount(privateKey);
  } catch {
    console.error("[ENS] Invalid ENS_PRIVATE_KEY format");
    return null;
  }

  const transport = http(rpcUrl);
  const publicClient = createPublicClient({ chain: mainnet, transport });
  const walletClient = createWalletClient({ account, chain: mainnet, transport });

  const subnameNode = namehash(`${name}.subframe.eth`);
  const contenthash = cidToContentHash(ipfsCid);
  const labelHash = keccak256(toBytes(name)) as `0x${string}`;

  console.log(`[ENS] Registering ${name}.subframe.eth on-chain...`);
  console.log(`[ENS] Backend wallet: ${account.address}`);
  console.log(`[ENS] User wallet: ${userWallet}`);
  console.log(`[ENS] IPFS CID: ${ipfsCid}`);

  let isWrapped = false;
  try {
    const tokenOwner = await publicClient.readContract({
      address: NAME_WRAPPER,
      abi: NAME_WRAPPER_ABI,
      functionName: "ownerOf",
      args: [BigInt(PARENT_NODE)],
    });
    isWrapped = tokenOwner !== "0x0000000000000000000000000000000000000000";
    console.log(`[ENS] subframe.eth is ${isWrapped ? "wrapped (NameWrapper)" : "unwrapped (Registry)"}`);
  } catch {
    console.log("[ENS] NameWrapper check failed, assuming unwrapped");
  }

  let createTxHash: `0x${string}`;

  if (isWrapped) {
    console.log(`[ENS] Step 1: NameWrapper.setSubnodeRecord(${name})`);
    createTxHash = await walletClient.writeContract({
      address: NAME_WRAPPER,
      abi: NAME_WRAPPER_ABI,
      functionName: "setSubnodeRecord",
      args: [
        PARENT_NODE,
        name,
        account.address,
        PUBLIC_RESOLVER,
        0n,
        0,
        BigInt("18446744073709551615"),
      ],
    });
  } else {
    console.log(`[ENS] Step 1: Registry.setSubnodeRecord(${name})`);
    createTxHash = await walletClient.writeContract({
      address: ENS_REGISTRY,
      abi: REGISTRY_ABI,
      functionName: "setSubnodeRecord",
      args: [PARENT_NODE, labelHash, account.address, PUBLIC_RESOLVER, 0n],
    });
  }

  const TX_TIMEOUT = 10 * 60 * 1000; // 10 minutes — mainnet can be slow

  console.log(`[ENS] Step 1 tx: ${createTxHash}, waiting...`);
  await publicClient.waitForTransactionReceipt({ hash: createTxHash, timeout: TX_TIMEOUT });
  console.log("[ENS] Step 1 confirmed");
  await onStep?.(1, createTxHash);

  console.log("[ENS] Step 2: setContenthash");
  const contentTxHash = await walletClient.writeContract({
    address: PUBLIC_RESOLVER,
    abi: RESOLVER_ABI,
    functionName: "setContenthash",
    args: [subnameNode, contenthash],
  });
  console.log(`[ENS] Step 2 tx: ${contentTxHash}, waiting...`);
  await publicClient.waitForTransactionReceipt({ hash: contentTxHash, timeout: TX_TIMEOUT });
  console.log("[ENS] Step 2 confirmed");
  await onStep?.(2, contentTxHash);

  console.log("[ENS] Step 3: setAddr");
  const addrTxHash = await walletClient.writeContract({
    address: PUBLIC_RESOLVER,
    abi: RESOLVER_ABI,
    functionName: "setAddr",
    args: [subnameNode, userWallet as Address],
  });
  console.log(`[ENS] Step 3 tx: ${addrTxHash}, waiting...`);
  await publicClient.waitForTransactionReceipt({ hash: addrTxHash, timeout: TX_TIMEOUT });
  console.log("[ENS] Step 3 confirmed");
  await onStep?.(3, addrTxHash);

  // Step 4: Transfer ownership of the subdomain to the user wallet
  // After this, the user controls their own subdomain and can set it as primary ENS
  let transferTxHash: `0x${string}`;
  if (isWrapped) {
    console.log("[ENS] Step 4: NameWrapper.safeTransferFrom (transfer to user)");
    transferTxHash = await walletClient.writeContract({
      address: NAME_WRAPPER,
      abi: NAME_WRAPPER_ABI,
      functionName: "safeTransferFrom",
      args: [account.address, userWallet as Address, BigInt(subnameNode), 1n, "0x"],
    });
  } else {
    console.log("[ENS] Step 4: Registry.setOwner (transfer to user)");
    transferTxHash = await walletClient.writeContract({
      address: ENS_REGISTRY,
      abi: REGISTRY_ABI,
      functionName: "setOwner",
      args: [subnameNode, userWallet as Address],
    });
  }
  console.log(`[ENS] Step 4 tx: ${transferTxHash}, waiting...`);
  await publicClient.waitForTransactionReceipt({ hash: transferTxHash, timeout: TX_TIMEOUT });
  console.log(`[ENS] Step 4 confirmed — ${name}.subframe.eth transferred to ${userWallet}`);
  await onStep?.(4, transferTxHash);

  return { txHash: createTxHash };
}

const ENS_REGISTRY_ABI = [
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
  {
    name: "resolver",
    type: "function",
    inputs: [{ name: "node", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
] as const;

/* Set contenthash on the PARENT subframe.eth domain so that
   subframe.eth.limo (and path routes like /profile/test) resolve.
   Backend wallet owns subframe.eth in ENS registry so no user signature needed.
   Step 1: setResolver (switch to PUBLIC_RESOLVER if not already set)
   Step 2: setContenthash on PUBLIC_RESOLVER */
export async function setParentContenthash(ipfsCid: string): Promise<string | null> {
  const rawKey = process.env["ENS_PRIVATE_KEY"];
  if (!rawKey) return null;
  const privateKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;

  const account = privateKeyToAccount(privateKey);
  const transport = http(DEFAULT_RPC);
  const publicClient = createPublicClient({ chain: mainnet, transport });
  const walletClient = createWalletClient({ account, chain: mainnet, transport });

  const feeData = await publicClient.estimateFeesPerGas();
  const maxPriorityFeePerGas = BigInt(2_000_000_000);
  const maxFeePerGas = (feeData.maxFeePerGas ?? BigInt(10_000_000_000)) * 2n + maxPriorityFeePerGas;

  // Step 1: Switch resolver to PUBLIC_RESOLVER if it's not already set
  const currentResolver = await publicClient.readContract({
    address: ENS_REGISTRY,
    abi: ENS_REGISTRY_ABI,
    functionName: "resolver",
    args: [PARENT_NODE],
  });

  if (currentResolver.toLowerCase() !== PUBLIC_RESOLVER.toLowerCase()) {
    console.log(`[ENS:parent] Resolver is ${currentResolver}, switching to PUBLIC_RESOLVER...`);
    const setResolverTx = await walletClient.writeContract({
      address: ENS_REGISTRY,
      abi: ENS_REGISTRY_ABI,
      functionName: "setResolver",
      args: [PARENT_NODE, PUBLIC_RESOLVER],
      maxFeePerGas,
      maxPriorityFeePerGas,
    });
    console.log(`[ENS:parent] setResolver TX: ${setResolverTx}, waiting...`);
    await publicClient.waitForTransactionReceipt({ hash: setResolverTx, timeout: 10 * 60 * 1000 });
    console.log(`[ENS:parent] Resolver updated to PUBLIC_RESOLVER`);
  } else {
    console.log(`[ENS:parent] Resolver already set to PUBLIC_RESOLVER`);
  }

  // Step 2: Set contenthash on PUBLIC_RESOLVER
  const contenthash = cidToContentHash(ipfsCid);
  console.log(`[ENS:parent] Setting contenthash on subframe.eth`);
  console.log(`[ENS:parent] CID: ${ipfsCid} -> ${contenthash}`);

  const feeData2 = await publicClient.estimateFeesPerGas();
  const mfpg2 = (feeData2.maxFeePerGas ?? BigInt(10_000_000_000)) * 2n + maxPriorityFeePerGas;

  const txHash = await walletClient.writeContract({
    address: PUBLIC_RESOLVER,
    abi: RESOLVER_ABI,
    functionName: "setContenthash",
    args: [PARENT_NODE, contenthash],
    maxFeePerGas: mfpg2,
    maxPriorityFeePerGas,
  });

  console.log(`[ENS:parent] contenthash TX: ${txHash}, waiting...`);
  await publicClient.waitForTransactionReceipt({ hash: txHash, timeout: 10 * 60 * 1000 });
  console.log(`[ENS:parent] Done — subframe.eth contenthash live`);
  return txHash;
}
