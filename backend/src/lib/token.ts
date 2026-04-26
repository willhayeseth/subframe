import {
  createWalletClient,
  createPublicClient,
  http,
  encodeAbiParameters,
  keccak256,
  decodeEventLog,
  zeroAddress,
  type Address,
} from "viem";
import { mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { ERC404_IMPL_BYTECODE, ERC404_IMPL_ABI }    from "../contracts/SubframeERC404Impl.js";
import { ERC404_FACTORY_BYTECODE, ERC404_FACTORY_ABI } from "../contracts/SubframeERC404Factory.js";
import { logger } from "./logger.js";

// ─── RPC / env ────────────────────────────────────────────────────────────────

const RPCS = [
  process.env["ETH_RPC_URL"] ?? "https://eth.drpc.org",
  "https://eth.drpc.org",
  "https://ethereum.publicnode.com",
  "https://rpc.ankr.com/eth",
];

const PROTOCOL_TREASURY = (
  process.env["PROTOCOL_TREASURY"] ?? "0x0000000000000000000000000000000000000000"
) as Address;

// ─── Uniswap V4 mainnet addresses ─────────────────────────────────────────────

const V4_POOL_MANAGER     = "0x000000000004444c5dc75cB358380D2e3dE08A90" as Address;
const V4_POSITION_MANAGER = "0x1B1C77B606d13b09C84d1c7394B96b147bC03147" as Address;

// V4 fee tier: 0.3%, tickSpacing = 60
const V4_FEE          = 3000;
const V4_TICK_SPACING = 60;

// Full-range ticks
const TICK_LOWER = -887220;
const TICK_UPPER =  887220;

// Initial price: 1 ETH = 100,000 tokens
const INITIAL_SQRT_PRICE_X96 = 25054144837504793118641380157n;

// Seed: 0.001 ETH + 6210 tokens
const SEED_ETH_WEI   = 1_000_000_000_000_000n;
const SEED_TOKEN_AMT = 6210n * 10n ** 18n;
const INITIAL_LIQUIDITY = 3_000_000_000_000_000n;

// ─── Module-level one-time deployment cache ────────────────────────────────────
// Set from env on startup; updated after first deploy so subsequent calls reuse.

let _factoryAddress: Address | null =
  process.env["ART_FACTORY_ADDRESS"] ? (process.env["ART_FACTORY_ADDRESS"] as Address) : null;

// ─── Minimal ABIs ─────────────────────────────────────────────────────────────

const POOL_MANAGER_ABI = [
  {
    name: "initialize",
    type: "function",
    inputs: [
      {
        name: "key", type: "tuple",
        components: [
          { name: "currency0",   type: "address" },
          { name: "currency1",   type: "address" },
          { name: "fee",         type: "uint24"  },
          { name: "tickSpacing", type: "int24"   },
          { name: "hooks",       type: "address" },
        ],
      },
      { name: "sqrtPriceX96", type: "uint160" },
    ],
    outputs: [{ name: "tick", type: "int24" }],
    stateMutability: "nonpayable",
  },
] as const;

const POSITION_MANAGER_ABI = [
  {
    name: "modifyLiquidities",
    type: "function",
    inputs: [
      { name: "unlockData", type: "bytes"   },
      { name: "deadline",   type: "uint256" },
    ],
    outputs: [],
    stateMutability: "payable",
  },
] as const;

const ERC20_APPROVE_ABI = [
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount",  type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
  },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClients() {
  const rawKey = process.env["ENS_PRIVATE_KEY"] ?? "";
  if (!rawKey) throw new Error("ENS_PRIVATE_KEY not set");
  const key = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const account = privateKeyToAccount(key);
  const publicClient = createPublicClient({ chain: mainnet, transport: http(RPCS[0]) });
  const walletClient = createWalletClient({ account, chain: mainnet, transport: http(RPCS[0]) });
  return { account, publicClient, walletClient };
}

async function gasParams(publicClient: ReturnType<typeof createPublicClient>) {
  const PRIORITY_FEE = 2_000_000_000n;
  const feeData = await publicClient.estimateFeesPerGas();
  const maxFeePerGas = (feeData.maxFeePerGas ?? 20_000_000_000n) + PRIORITY_FEE;
  return { maxFeePerGas, maxPriorityFeePerGas: PRIORITY_FEE, chain: mainnet } as const;
}

async function waitTx(
  publicClient: ReturnType<typeof createPublicClient>,
  hash: `0x${string}`,
  label: string,
) {
  logger.info(`[TOKEN] Waiting for ${label}: ${hash}`);
  const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 120_000 });
  if (receipt.status !== "success") throw new Error(`Tx reverted: ${label} (${hash})`);
  logger.info(`[TOKEN] ${label} confirmed in block ${receipt.blockNumber}`);
  return receipt;
}

/**
 * Build the abi-encoded unlockData for seeding a full-range V4 liquidity position.
 */
function buildSeedLiquidityCalldata(
  tokenAddress: Address,
  hookAddress: Address,
  recipientAddress: Address,
): `0x${string}` {
  const poolKey = {
    currency0:   zeroAddress,
    currency1:   tokenAddress,
    fee:         V4_FEE,
    tickSpacing: V4_TICK_SPACING,
    hooks:       hookAddress,
  };

  const mintParams = encodeAbiParameters(
    [
      {
        name: "poolKey", type: "tuple",
        components: [
          { name: "currency0",   type: "address" },
          { name: "currency1",   type: "address" },
          { name: "fee",         type: "uint24"  },
          { name: "tickSpacing", type: "int24"   },
          { name: "hooks",       type: "address" },
        ],
      },
      { name: "tickLower",  type: "int24"   },
      { name: "tickUpper",  type: "int24"   },
      { name: "liquidity",  type: "uint256" },
      { name: "amount0Max", type: "uint128" },
      { name: "amount1Max", type: "uint128" },
      { name: "owner",      type: "address" },
      { name: "hookData",   type: "bytes"   },
    ],
    [poolKey, TICK_LOWER, TICK_UPPER, INITIAL_LIQUIDITY, SEED_ETH_WEI, SEED_TOKEN_AMT, recipientAddress, "0x"],
  );

  const settleParams = encodeAbiParameters(
    [{ type: "address" }, { type: "address" }],
    [zeroAddress, tokenAddress],
  );

  const actionsBytes = "0x0210"; // MINT_POSITION, SETTLE_PAIR
  return encodeAbiParameters(
    [{ type: "bytes" }, { type: "bytes[]" }],
    [actionsBytes, [mintParams, settleParams]],
  );
}

/**
 * Compute the canonical Uniswap V4 pool ID (keccak256 of the 5 PoolKey fields).
 */
function computePoolId(tokenAddress: Address, hookAddress: Address): `0x${string}` {
  return keccak256(
    encodeAbiParameters(
      [
        { type: "address" },
        { type: "address" },
        { type: "uint24"  },
        { type: "int24"   },
        { type: "address" },
      ],
      [zeroAddress, tokenAddress, V4_FEE, V4_TICK_SPACING, hookAddress],
    ),
  );
}

// ─── One-time infrastructure helpers ──────────────────────────────────────────

type WalletCl = ReturnType<typeof createWalletClient>;
type PublicCl = ReturnType<typeof createPublicClient>;
type GasParams = Awaited<ReturnType<typeof gasParams>>;
type Account  = ReturnType<typeof privateKeyToAccount>;

async function ensureFactoryDeployed(
  account: Account,
  walletClient: WalletCl,
  publicClient: PublicCl,
  gas: GasParams,
): Promise<Address> {
  if (_factoryAddress) return _factoryAddress;

  logger.info("[TOKEN] Deploying SubframeERC404Impl (one-time per chain)...");
  const implHash = await walletClient.deployContract({
    account,
    abi: ERC404_IMPL_ABI,
    bytecode: ERC404_IMPL_BYTECODE,
    args: [],
    ...gas,
  });
  const implReceipt = await waitTx(publicClient, implHash, "deploy ERC404Impl");
  if (!implReceipt.contractAddress) throw new Error("Impl deploy failed");
  logger.info(`[TOKEN] ERC404Impl at ${implReceipt.contractAddress}`);

  logger.info("[TOKEN] Deploying SubframeERC404Factory...");
  const factHash = await walletClient.deployContract({
    account,
    abi: ERC404_FACTORY_ABI,
    bytecode: ERC404_FACTORY_BYTECODE,
    args: [implReceipt.contractAddress],
    ...gas,
  });
  const factReceipt = await waitTx(publicClient, factHash, "deploy ERC404Factory");
  if (!factReceipt.contractAddress) throw new Error("Factory deploy failed");
  _factoryAddress = factReceipt.contractAddress;
  logger.warn(`[TOKEN] Set ART_FACTORY_ADDRESS=${_factoryAddress} in env to skip re-deploy`);
  return _factoryAddress;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface DeployArtTokenResult {
  contractAddress:   Address;
  artTokenId:        string;
  createTxHash:      `0x${string}`;
  tokenAddress:      Address;
  tokenTxHash:       `0x${string}`;
  /** Uniswap V4 pool ID (keccak256 of pool key) — stored as text, NOT an EVM address */
  pairAddress:       `0x${string}`;
  liquidityTxHash:   `0x${string}`;
}

/**
 * Deploy an ERC-404 clone for a subdomain and seed a Uniswap V4 pool.
 *
 * V1 Flow (standard Uniswap V4 pool, no custom hook):
 *  1. Ensure ERC-404 factory is deployed (cached per-process via _factoryAddress)
 *  2. Clone ERC-404 token via factory.createToken()
 *  3. Approve V4 PositionManager to spend seed tokens
 *  4. Initialize V4 pool (hooks = zeroAddress for standard pool)
 *  5. Seed initial liquidity via PositionManager
 */
export async function deployArtToken(params: {
  subdomainName: string;
  creatorWallet:  Address;
  tokenName:      string;
  tokenSymbol:    string;
  metadataUri?:   string;
}): Promise<DeployArtTokenResult> {
  if (!process.env["ENS_PRIVATE_KEY"]) throw new Error("ENS_PRIVATE_KEY not set");

  const { creatorWallet, tokenName, tokenSymbol, metadataUri } = params;
  const { account, publicClient, walletClient } = getClients();
  const gas = await gasParams(publicClient);

  const treasury =
    PROTOCOL_TREASURY !== zeroAddress ? PROTOCOL_TREASURY : account.address;

  const baseURI = metadataUri
    ? (metadataUri.endsWith("/") ? metadataUri : `${metadataUri}/`)
    : `ipfs://subframe/${params.subdomainName}/art/`;

  // ── Step 1: ensure factory ──────────────────────────────────────────────────
  const factoryAddress = await ensureFactoryDeployed(account, walletClient, publicClient, gas);

  // V1: standard Uniswap V4 pool with no custom hook
  const hookAddress: Address = zeroAddress;

  // ── Step 2: clone ERC-404 token ─────────────────────────────────────────────
  logger.info(`[TOKEN] Cloning ERC-404 for ${params.subdomainName}...`);
  const cloneHash = await walletClient.writeContract({
    account,
    address: factoryAddress,
    abi: ERC404_FACTORY_ABI,
    functionName: "createToken",
    args: [tokenName, tokenSymbol, creatorWallet, treasury, baseURI],
    ...gas,
  });
  const cloneReceipt = await waitTx(publicClient, cloneHash, "createToken");

  let tokenAddress: Address | null = null;
  for (const log of cloneReceipt.logs) {
    try {
      const decoded = decodeEventLog({
        abi: ERC404_FACTORY_ABI,
        data: log.data,
        topics: log.topics,
      });
      if (decoded.eventName === "TokenCreated") {
        tokenAddress = (decoded.args as { clone: Address }).clone;
        break;
      }
    } catch { /* non-matching logs */ }
  }
  if (!tokenAddress) throw new Error("Could not find TokenCreated event");
  logger.info(`[TOKEN] ERC-404 clone at ${tokenAddress}`);

  // ── Step 3: approve V4 PositionManager ─────────────────────────────────────
  const approveHash = await walletClient.writeContract({
    account,
    address: tokenAddress,
    abi: ERC20_APPROVE_ABI,
    functionName: "approve",
    args: [V4_POSITION_MANAGER, SEED_TOKEN_AMT],
    ...gas,
  });
  await waitTx(publicClient, approveHash, "approve PositionManager");

  // Compute pool key hash (canonical V4 PoolId)
  const poolKeyHash = computePoolId(tokenAddress, hookAddress);
  logger.info(`[TOKEN] Pool ID: ${poolKeyHash}`);

  // ── Step 4: initialize V4 standard pool (hooks=zeroAddress) ──────────────────────────────────
  const poolKey = {
    currency0:   zeroAddress,
    currency1:   tokenAddress,
    fee:         V4_FEE,
    tickSpacing: V4_TICK_SPACING,
    hooks:       hookAddress,
  };

  try {
    const poolInitHash = await walletClient.writeContract({
      account,
      address: V4_POOL_MANAGER,
      abi: POOL_MANAGER_ABI,
      functionName: "initialize",
      args: [poolKey, INITIAL_SQRT_PRICE_X96],
      ...gas,
    });
    await waitTx(publicClient, poolInitHash, "V4 pool initialize");
    logger.info("[TOKEN] V4 pool initialized");
  } catch (err) {
    const msg = String((err as Error).message ?? "");
    if (msg.includes("PoolAlreadyInitialized") || msg.includes("0xefa10d52")) {
      logger.info("[TOKEN] Pool already initialized, continuing...");
    } else {
      throw new Error(`V4 pool init failed: ${msg}`);
    }
  }

  // ── Step 5: seed initial liquidity ──────────────────────────────────────────
  logger.info("[TOKEN] Seeding V4 liquidity...");
  const unlockData = buildSeedLiquidityCalldata(tokenAddress, hookAddress, account.address);
  const deadline   = BigInt(Math.floor(Date.now() / 1000) + 600);

  const liquidityTxHash = await walletClient.writeContract({
    account,
    address: V4_POSITION_MANAGER,
    abi: POSITION_MANAGER_ABI,
    functionName: "modifyLiquidities",
    args: [unlockData, deadline],
    value: SEED_ETH_WEI,
    ...gas,
  });
  await waitTx(publicClient, liquidityTxHash, "V4 seed liquidity");
  logger.info("[TOKEN] Liquidity seeded successfully");

  return {
    contractAddress: tokenAddress,
    artTokenId:      "0",
    createTxHash:    cloneHash,
    tokenAddress,
    tokenTxHash:     cloneHash,
    pairAddress:     poolKeyHash,   // V4 pool ID (bytes32 hash), not an EVM address
    liquidityTxHash,
  };
}

export function buildTokenMeta(subdomainName: string): {
  tokenName: string;
  tokenSymbol: string;
} {
  const clean = subdomainName.replace(/[^a-z0-9]/g, "");
  const upper = clean.toUpperCase();
  const tokenName   = `${clean.charAt(0).toUpperCase()}${clean.slice(1)} Art`;
  const tokenSymbol = upper.length <= 6 ? upper : upper.slice(0, 6);
  return { tokenName, tokenSymbol };
}
