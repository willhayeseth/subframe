import {
  createWalletClient,
  createPublicClient,
  http,
  encodeAbiParameters,
  keccak256,
  decodeEventLog,
  zeroAddress,
  parseAbi,
  type Address,
} from "viem";
import { sepolia, mainnet } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { ERC404_FACTORY_ABI, ERC404_FACTORY_BYTECODE } from "../contracts/SubframeERC404Factory.js";
import { ERC404_IMPL_ABI,     ERC404_IMPL_BYTECODE }    from "../contracts/SubframeERC404Impl.js";
import { logger } from "./logger.js";

// ─── Network config ────────────────────────────────────────────────────────────
// Set NETWORK=sepolia (default) or NETWORK=mainnet

const NETWORK = (process.env["NETWORK"] ?? "sepolia").toLowerCase();
const IS_SEPOLIA = NETWORK !== "mainnet";

// V4 contract addresses — differ per chain
const V4_CONFIG = {
  sepolia: {
    poolManager:     "0x8C4BcBE6b9eF47855f97E675296FA3F6fafa5F1A" as Address,
    positionManager: "0x1B1C77B606d13b09C84d1c7394B96b147bC03147" as Address,
  },
  mainnet: {
    poolManager:     "0x000000000004444c5dc75cB358380D2e3dE08A90" as Address,
    positionManager: "0xbD216513d74C8cf14cf4747E6AaA6420FF64ee9e" as Address,
  },
} as const;

const V4_ADDRESSES = IS_SEPOLIA ? V4_CONFIG.sepolia : V4_CONFIG.mainnet;
const V4_POOL_MANAGER     = V4_ADDRESSES.poolManager;
const V4_POSITION_MANAGER = V4_ADDRESSES.positionManager;

// PERMIT2 is the same on all chains
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3" as Address;

// ─── Hook + Factory (set these env vars after deploy_contracts.js) ─────────────
//   ART_FACTORY_ADDRESS — deployed SubframeERC404Factory address
//   HOOK_ADDRESS        — deployed SubframeSwapHookV2 address

const HOOK_ADDRESS: Address = (process.env["HOOK_ADDRESS"] ?? zeroAddress) as Address;

// ─── Protocol treasury ─────────────────────────────────────────────────────────
const PROTOCOL_TREASURY = (process.env["PROTOCOL_TREASURY"] ?? zeroAddress) as Address;

// ─── RPC endpoints ─────────────────────────────────────────────────────────────
// ETH_RPC_URL is treated as the mainnet RPC. For Sepolia, always use public drpc.
const RPC_URL = IS_SEPOLIA
  ? "https://sepolia.drpc.org"
  : (process.env["ETH_RPC_URL"] ?? "https://eth.drpc.org");

// ─── Uniswap V4 pool parameters ───────────────────────────────────────────────
const V4_FEE          = 3000;           // 0.3%
const V4_TICK_SPACING = 60;

// Token-only seeding: seed position range must have TICK_UPPER < INIT_TICK.
// Pool initialised at tick 69060 (price ≈ 992 tokens/ETH → 0.001 ETH = 1 token).
// Position range [-887220, 69000]: since pool_tick (69060) > TICK_UPPER (69000),
// the entire position is token1 (ERC-404) — zero ETH required.
const TICK_LOWER_SEED = -887220;
const TICK_UPPER_SEED =  69000;   // below INIT_TICK → token-only position
const INIT_TICK       =  69060;   // pool init price

// sqrtPrice at INIT_TICK 69060 (pre-computed via TickMath):
// = getSqrtRatioAtTick(69060) = 2502784483440051878955016419363
const INITIAL_SQRT_PRICE_X96 = 2502784483440051878955016419363n as bigint;

// Full token supply: 6900 tokens (all seeded, 0 to platform/creator)
const TOKEN_SUPPLY   = 6_900n * 10n ** 18n;

// UINT limits
const MAX_UINT256 = 2n ** 256n - 1n;
const MAX_UINT160 = 2n ** 160n - 1n;

// ─── Module-level factory address cache ───────────────────────────────────────
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

const HOOK_REGISTER_ABI = parseAbi([
  "function registerPool(bytes32 poolId, address creator, address treasury) external",
]);

const ERC20_APPROVE_ABI = parseAbi([
  "function approve(address spender, uint256 amount) returns (bool)",
]);

const PERMIT2_APPROVE_ABI = parseAbi([
  "function approve(address token, address spender, uint160 amount, uint48 expiration) external",
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getClients() {
  const rawKey = process.env["ENS_PRIVATE_KEY"] ?? "";
  if (!rawKey) throw new Error("ENS_PRIVATE_KEY not set");
  const key = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const account = privateKeyToAccount(key);
  const chain   = IS_SEPOLIA ? sepolia : mainnet;
  const publicClient  = createPublicClient({ chain, transport: http(RPC_URL) });
  const walletClient  = createWalletClient({ account, chain, transport: http(RPC_URL) });
  return { account, publicClient, walletClient, chain };
}

async function gasParams(publicClient: ReturnType<typeof createPublicClient>) {
  const PRIORITY_FEE = 2_000_000_000n;
  const feeData = await publicClient.estimateFeesPerGas();
  const maxFeePerGas = (feeData.maxFeePerGas ?? 20_000_000_000n) + PRIORITY_FEE;
  return { maxFeePerGas, maxPriorityFeePerGas: PRIORITY_FEE } as const;
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

// ─── Etherscan proxy verification ────────────────────────────────────────────
/**
 * Submit EIP-1167 proxy verification to Etherscan V2 for a newly deployed clone.
 * Etherscan detects the impl address from bytecode and marks it as a proxy.
 * Non-critical — called fire-and-forget after createToken.
 */
async function verifyProxyOnEtherscan(proxyAddress: Address, chainId: number): Promise<void> {
  const apiKey = process.env["ETHERSCAN_API_KEY"];
  if (!apiKey) {
    logger.info("[TOKEN:etherscan] ETHERSCAN_API_KEY not set — skipping proxy verify");
    return;
  }
  const url = `https://api.etherscan.io/v2/api?chainid=${chainId}&apikey=${apiKey}&module=contract&action=verifyproxycontract`;
  const body = new URLSearchParams({ address: proxyAddress });
  const res = await fetch(url, {
    method: "POST",
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  const data = await res.json() as { status: string; result: string; message: string };
  if (data.status !== "1") {
    throw new Error(`${data.message} — ${data.result}`);
  }
  logger.info(`[TOKEN:etherscan] Proxy verify submitted for ${proxyAddress} (GUID: ${data.result})`);
}

// ─── Liquidity math ───────────────────────────────────────────────────────────

/**
 * Minimal TickMath port — returns sqrtPriceX96 (Q96) at a given tick.
 * Used to compute liquidity for the token-only seed position.
 */
function getSqrtRatioAtTick(tick: number): bigint {
  const absTick = tick < 0 ? BigInt(-tick) : BigInt(tick);
  let ratio = (absTick & 1n) !== 0n
    ? 0xfffcb933bd6fad37aa2d162d1a594001n
    : 0x100000000000000000000000000000000n;
  if ((absTick & 0x2n)     !== 0n) ratio = (ratio * 0xfff97272373d413259a46990580e213an) >> 128n;
  if ((absTick & 0x4n)     !== 0n) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdccn) >> 128n;
  if ((absTick & 0x8n)     !== 0n) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0n) >> 128n;
  if ((absTick & 0x10n)    !== 0n) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644n) >> 128n;
  if ((absTick & 0x20n)    !== 0n) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0n) >> 128n;
  if ((absTick & 0x40n)    !== 0n) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861n) >> 128n;
  if ((absTick & 0x80n)    !== 0n) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053n) >> 128n;
  if ((absTick & 0x100n)   !== 0n) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4n) >> 128n;
  if ((absTick & 0x200n)   !== 0n) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54n) >> 128n;
  if ((absTick & 0x400n)   !== 0n) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3n) >> 128n;
  if ((absTick & 0x800n)   !== 0n) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9n) >> 128n;
  if ((absTick & 0x1000n)  !== 0n) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825n) >> 128n;
  if ((absTick & 0x2000n)  !== 0n) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5n) >> 128n;
  if ((absTick & 0x4000n)  !== 0n) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7n) >> 128n;
  if ((absTick & 0x8000n)  !== 0n) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6n) >> 128n;
  if ((absTick & 0x10000n) !== 0n) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9n)  >> 128n;
  if ((absTick & 0x20000n) !== 0n) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604n)   >> 128n;
  if ((absTick & 0x40000n) !== 0n) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98n)      >> 128n;
  if ((absTick & 0x80000n) !== 0n) ratio = (ratio * 0x48a170391f7dc42444e8fa2n)           >> 128n;
  if (tick > 0) {
    const MAX_UINT256 = (1n << 256n) - 1n;
    ratio = MAX_UINT256 / ratio;
  }
  return (ratio >> 32n) + ((ratio % (1n << 32n)) !== 0n ? 1n : 0n);
}

/**
 * Compute liquidity L to hold `tokenAmt` of token1 in range [tickLower, tickUpper]
 * when the pool tick is ABOVE tickUpper (token-only position, 0 ETH needed).
 *
 * Formula: amount1 = L * (sqrtUpper - sqrtLower) / Q96
 *       → L = amount1 * Q96 / (sqrtUpper - sqrtLower)
 */
function computeLiquidityForTokens(tokenAmt: bigint, tickLower: number, tickUpper: number): bigint {
  const Q96 = 1n << 96n;
  const sqrtLower = getSqrtRatioAtTick(tickLower);
  const sqrtUpper = getSqrtRatioAtTick(tickUpper);
  return (tokenAmt * Q96) / (sqrtUpper - sqrtLower);
}

// ─── Calldata builders ────────────────────────────────────────────────────────

/**
 * Build calldata for a V4 BUY (ETH → token) swap via Universal Router v2.
 *
 * CONFIRMED WORKING ON MAINNET (verified 2025-04-26):
 *   Router:  0x66a9893cc07d91d95644aedd05d03f95e1dba8af
 *   Command: 0x10 (V4_SWAP)
 *   Actions: 0x060c0f  (SWAP_EXACT_IN_SINGLE | SETTLE_ALL | TAKE_ALL)
 *
 * CRITICAL ENCODING NOTES:
 *   SWAP_EXACT_IN_SINGLE (0x06): (poolKey, zeroForOne, amountIn, amountOutMinimum, hookData)
 *     - 4th field is amountOutMinimum (uint128), NOT sqrtPriceLimitX96!
 *     - Passing MAX_SQRT as amountOutMinimum causes V4TooLittleReceived (always reverts)
 *   SETTLE_ALL (0x0c): (currency, maxAmountIn, payerIsUser)
 *     - payerIsUser=false → router pays from msg.value (ETH)
 *   TAKE_ALL   (0x0f): (currency, minAmountOut) — ONLY 2 ARGS (no recipient!)
 *     - recipient is implicitly msg.sender
 *     - WRONG: encoding 3 args causes recipient address to be misread as minAmountOut
 *
 * @param tokenAddress  ERC-404 token (currency1)
 * @param hookAddress   SubframeSwapHookV2 address
 * @param amountIn      Exact ETH amount in (wei)
 * @param minAmountOut  Minimum token amount out (wei), default 0
 * @param deadline      Unix timestamp (seconds), default now + 10 min
 */
export function buildV4SwapCalldata(
  tokenAddress:  Address,
  hookAddress:   Address,
  amountIn:      bigint,
  minAmountOut:  bigint = 0n,
  deadline?:     bigint,
): `0x${string}` {
  const dl = deadline ?? BigInt(Math.floor(Date.now() / 1000) + 600);

  const poolKey = {
    currency0:   zeroAddress,
    currency1:   tokenAddress,
    fee:         V4_FEE,
    tickSpacing: V4_TICK_SPACING,
    hooks:       hookAddress,
  };

  const swapParams = encodeAbiParameters(
    [
      {
        name: "poolKey", type: "tuple",
        components: [
          { name: "currency0",      type: "address" },
          { name: "currency1",      type: "address" },
          { name: "fee",            type: "uint24"  },
          { name: "tickSpacing",    type: "int24"   },
          { name: "hooks",          type: "address" },
        ],
      },
      { name: "zeroForOne",         type: "bool"    },
      { name: "amountIn",           type: "uint128" },
      { name: "amountOutMinimum",   type: "uint128" },
      { name: "hookData",           type: "bytes"   },
    ],
    [poolKey, true, amountIn, minAmountOut, "0x"],
  );

  // SETTLE_ALL: (currency, maxAmountIn, payerIsUser)
  // payerIsUser=false → router pays from msg.value (native ETH)
  const settleParams = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }, { type: "bool" }],
    [zeroAddress, amountIn, false],
  );

  // TAKE_ALL: (currency, minAmountOut) — NO recipient arg!
  const takeParams = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [tokenAddress, minAmountOut],
  );

  const v4In = encodeAbiParameters(
    [{ type: "bytes" }, { type: "bytes[]" }],
    ["0x060c0f", [swapParams, settleParams, takeParams]],
  );

  return ("0x3593564c" + encodeAbiParameters(
    [{ type: "bytes" }, { type: "bytes[]" }, { type: "uint256" }],
    ["0x10", [v4In], dl],
  ).slice(2)) as `0x${string}`;
}

/**
 * Build calldata for a V4 SELL (token → ETH) swap via Universal Router v2.
 *
 * CONFIRMED WORKING ON MAINNET (verified 2025-04-26):
 *   TX: 0xdeed73536ed3ef1cb5e60f583f085125ce250d13ecf022682c7afc22a709ee91
 *
 * PREREQUISITES (must be done once per wallet):
 *   1. token.approve(PERMIT2, MAX_UINT256)           — already set during pool seed
 *   2. permit2.approve(token, ROUTER, MAX160, expiry) — must be called before first sell
 *   3. token.approve(ROUTER, MAX_UINT256)             — fallback direct ERC-20 approval
 *
 * Actions: 0x060c0f (SWAP_EXACT_IN_SINGLE | SETTLE_ALL | TAKE_ALL)
 *   SWAP_EXACT_IN_SINGLE (0x06): (poolKey, zeroForOne=false, amountIn, amountOutMinimum, hookData)
 *   SETTLE_ALL           (0x0c): (token, maxAmountIn, payerIsUser=true) — pull token from user
 *   TAKE_ALL             (0x0f): (zeroAddress, minEthOut) — take ETH output
 *
 * @param tokenAddress  ERC-404 token (currency1)
 * @param hookAddress   SubframeSwapHookV2 address
 * @param amountIn      Exact token amount to sell (wei, e.g. 1e18 = 1 token)
 * @param minEthOut     Minimum ETH to receive (wei), default 0 (accept any)
 * @param deadline      Unix timestamp (seconds), default now + 10 min
 */
export function buildV4SellCalldata(
  tokenAddress:  Address,
  hookAddress:   Address,
  amountIn:      bigint,
  minEthOut:     bigint = 0n,
  deadline?:     bigint,
): `0x${string}` {
  const dl = deadline ?? BigInt(Math.floor(Date.now() / 1000) + 600);

  const poolKey = {
    currency0:   zeroAddress,
    currency1:   tokenAddress,
    fee:         V4_FEE,
    tickSpacing: V4_TICK_SPACING,
    hooks:       hookAddress,
  };

  const swapParams = encodeAbiParameters(
    [
      {
        name: "poolKey", type: "tuple",
        components: [
          { name: "currency0",      type: "address" },
          { name: "currency1",      type: "address" },
          { name: "fee",            type: "uint24"  },
          { name: "tickSpacing",    type: "int24"   },
          { name: "hooks",          type: "address" },
        ],
      },
      { name: "zeroForOne",         type: "bool"    },
      { name: "amountIn",           type: "uint128" },
      { name: "amountOutMinimum",   type: "uint128" },
      { name: "hookData",           type: "bytes"   },
    ],
    [poolKey, false, amountIn, minEthOut, "0x"],
  );

  // SETTLE_ALL: pull token from user (payerIsUser=true uses permit2 or direct ERC-20 approval)
  const settleParams = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }, { type: "bool" }],
    [tokenAddress, amountIn, true],
  );

  // TAKE_ALL: receive ETH (zeroAddress = native ETH)
  const takeParams = encodeAbiParameters(
    [{ type: "address" }, { type: "uint256" }],
    [zeroAddress, minEthOut],
  );

  const v4In = encodeAbiParameters(
    [{ type: "bytes" }, { type: "bytes[]" }],
    ["0x060c0f", [swapParams, settleParams, takeParams]],
  );

  return ("0x3593564c" + encodeAbiParameters(
    [{ type: "bytes" }, { type: "bytes[]" }, { type: "uint256" }],
    ["0x10", [v4In], dl],
  ).slice(2)) as `0x${string}`;
}

/**
 * Build abi-encoded unlockData for V4 PositionManager.modifyLiquidities().
 *
 * This seeds a token-only position: pool tick starts at INIT_TICK (69060),
 * position range is [TICK_LOWER_SEED=-887220, TICK_UPPER_SEED=69000].
 * Since pool_tick > TICK_UPPER_SEED, the position holds 100% token1 and 0 ETH.
 *
 * V4 action codes:
 *   MINT_POSITION = 0x02
 *   SETTLE_PAIR   = 0x11
 *   SWEEP         = 0x19 (returns any unused native ETH)
 */
function buildSeedLiquidityCalldata(
  tokenAddress: Address,
  hookAddress:  Address,
  owner:        Address,
  liquidity:    bigint,
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
    [
      poolKey,
      TICK_LOWER_SEED,
      TICK_UPPER_SEED,
      liquidity,
      0n,                       // amount0Max = 0 ETH (token-only position)
      TOKEN_SUPPLY * 2n,        // amount1Max: 2× supply as generous slippage buffer
      owner,
      "0x",
    ],
  );

  const settleParams = encodeAbiParameters(
    [{ type: "address" }, { type: "address" }],
    [zeroAddress, tokenAddress],
  );

  const sweepParams = encodeAbiParameters(
    [{ type: "address" }, { type: "address" }],
    [zeroAddress, owner],
  );

  // Mainnet V4 POSM v1.0 action codes (DIFFERENT from Sepolia test deployment):
  // MINT_POSITION = 0x02, SETTLE_PAIR = 0x0d, SWEEP = 0x14
  // (Sepolia had SETTLE_PAIR=0x11, SWEEP=0x19 — those map to TAKE_PAIR/MINT_6909 on mainnet!)
  const actionsBytes = "0x020d14";
  return encodeAbiParameters(
    [{ type: "bytes" }, { type: "bytes[]" }],
    [actionsBytes, [mintParams, settleParams, sweepParams]],
  );
}

/**
 * Compute the canonical V4 pool ID (keccak256 of the 5 PoolKey fields).
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

// ─── Infrastructure helpers ───────────────────────────────────────────────────

type WalletCl = ReturnType<typeof createWalletClient>;
type PublicCl = ReturnType<typeof createPublicClient>;
type GasPs    = Awaited<ReturnType<typeof gasParams>>;
type Account  = ReturnType<typeof privateKeyToAccount>;

async function ensureFactoryDeployed(
  account:      Account,
  walletClient: WalletCl,
  publicClient: PublicCl,
  gas:          GasPs,
  chain:        typeof sepolia | typeof mainnet,
): Promise<Address> {
  if (_factoryAddress) return _factoryAddress;

  logger.info("[TOKEN] Deploying SubframeERC404Impl (one-time per chain)...");
  const implHash = await walletClient.deployContract({
    account,
    abi:      ERC404_IMPL_ABI,
    bytecode: ERC404_IMPL_BYTECODE,
    args:     [],
    ...gas,
    chain,
  });
  const implReceipt = await waitTx(publicClient, implHash, "deploy ERC404Impl");
  if (!implReceipt.contractAddress) throw new Error("ERC404Impl deploy failed");
  logger.info(`[TOKEN] ERC404Impl at ${implReceipt.contractAddress}`);

  logger.info("[TOKEN] Deploying SubframeERC404Factory...");
  const factHash = await walletClient.deployContract({
    account,
    abi:      ERC404_FACTORY_ABI,
    bytecode: ERC404_FACTORY_BYTECODE,
    args:     [implReceipt.contractAddress],
    ...gas,
    chain,
  });
  const factReceipt = await waitTx(publicClient, factHash, "deploy ERC404Factory");
  if (!factReceipt.contractAddress) throw new Error("Factory deploy failed");
  _factoryAddress = factReceipt.contractAddress;
  logger.warn(`[TOKEN] Set ART_FACTORY_ADDRESS=${_factoryAddress} in env to skip re-deploy`);
  return _factoryAddress;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface DeployArtTokenResult {
  contractAddress:  Address;
  artTokenId:       string;
  createTxHash:     `0x${string}`;
  tokenAddress:     Address;
  tokenTxHash:      `0x${string}`;
  pairAddress:      `0x${string}`;
  liquidityTxHash:  `0x${string}`;
}

/**
 * Deploy an ERC-404 clone for a subdomain and seed a Uniswap V4 pool.
 *
 * Flow:
 *  1. Ensure ERC-404 Impl + Factory are deployed (cached per-process via ART_FACTORY_ADDRESS)
 *  2. Clone ERC-404 token via factory.createToken()  →  all 6900 tokens → platform wallet
 *  3. ERC-20 approve(PERMIT2) + permit2.approve(PositionManager)
 *  4. Initialize V4 pool at tick 69060 (price ≈ 992 tokens/ETH)
 *  5. Seed token-only position [TICK_LOWER=-887220, TICK_UPPER=69000] with 6900 tokens, 0 ETH
 *  6. Register pool in hook (onlyOwner → platform wallet = account)
 *
 * Requires env vars:
 *   ENS_PRIVATE_KEY       deployer / hook owner
 *   ART_FACTORY_ADDRESS   deployed factory (or deploys fresh if missing)
 *   HOOK_ADDRESS          deployed SubframeSwapHookV2
 *   PROTOCOL_TREASURY     treasury wallet
 *   NETWORK               sepolia (default) | mainnet
 */
export async function deployArtToken(params: {
  subdomainName: string;
  creatorWallet: Address;
  tokenName:     string;
  tokenSymbol:   string;
  metadataUri?:  string;
}): Promise<DeployArtTokenResult> {
  if (!process.env["ENS_PRIVATE_KEY"]) throw new Error("ENS_PRIVATE_KEY not set");
  if (!HOOK_ADDRESS || HOOK_ADDRESS === zeroAddress) {
    throw new Error("HOOK_ADDRESS not set — run scripts/deploy_contracts.js first");
  }
  if (!V4_POSITION_MANAGER) {
    throw new Error("V4 PositionManager address not configured for this network");
  }

  const { creatorWallet, tokenName, tokenSymbol, metadataUri } = params;
  const { account, publicClient, walletClient, chain } = getClients();
  const gas = await gasParams(publicClient);

  const treasury = PROTOCOL_TREASURY !== zeroAddress ? PROTOCOL_TREASURY : account.address;

  const baseURI = metadataUri
    ? (metadataUri.endsWith("/") ? metadataUri : `${metadataUri}/`)
    : `ipfs://subframe/${params.subdomainName}/art/`;

  // ── Step 1: ensure factory ──────────────────────────────────────────────────
  const factoryAddress = await ensureFactoryDeployed(account, walletClient, publicClient, gas, chain);

  // ── Step 2: clone ERC-404 token ─────────────────────────────────────────────
  logger.info(`[TOKEN] Cloning ERC-404 for ${params.subdomainName}...`);
  const cloneHash = await walletClient.writeContract({
    account,
    address: factoryAddress,
    abi: ERC404_FACTORY_ABI,
    functionName: "createToken",
    args: [tokenName, tokenSymbol, creatorWallet, treasury, baseURI],
    chain,
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

  // Fire-and-forget: submit Etherscan proxy verification for the clone (EIP-1167)
  verifyProxyOnEtherscan(tokenAddress, chain.id).catch((e: Error) =>
    logger.warn(`[TOKEN] Etherscan proxy verify skipped (non-fatal): ${e.message}`)
  );

  // ── Step 3: PERMIT2 approval flow ───────────────────────────────────────────
  logger.info("[TOKEN] Setting ERC-20 → PERMIT2 approval...");
  const permit2ERC20Hash = await walletClient.writeContract({
    account,
    address: tokenAddress,
    abi: ERC20_APPROVE_ABI,
    functionName: "approve",
    args: [PERMIT2, MAX_UINT256],
    gas: 150_000n,
    chain,
    ...gas,
  });
  await waitTx(publicClient, permit2ERC20Hash, "token.approve(PERMIT2)");

  logger.info("[TOKEN] Setting PERMIT2 → PositionManager sub-allowance...");
  const expiration = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 3600);
  const permit2SubHash = await walletClient.writeContract({
    account,
    address: PERMIT2,
    abi: PERMIT2_APPROVE_ABI,
    functionName: "approve",
    args: [tokenAddress, V4_POSITION_MANAGER, MAX_UINT160, Number(expiration)],
    gas: 200_000n,
    chain,
    ...gas,
  });
  await waitTx(publicClient, permit2SubHash, "permit2.approve(token, positionManager)");

  // ── Step 4: initialize V4 pool at INIT_TICK (69060) ─────────────────────────
  const poolKey = {
    currency0:   zeroAddress,
    currency1:   tokenAddress,
    fee:         V4_FEE,
    tickSpacing: V4_TICK_SPACING,
    hooks:       HOOK_ADDRESS,
  };

  try {
    const poolInitHash = await walletClient.writeContract({
      account,
      address: V4_POOL_MANAGER,
      abi: POOL_MANAGER_ABI,
      functionName: "initialize",
      args: [poolKey, INITIAL_SQRT_PRICE_X96],
      chain,
      ...gas,
    });
    await waitTx(publicClient, poolInitHash, "V4 pool initialize");
    logger.info("[TOKEN] V4 pool initialized at tick 69060 (price ≈ 992 tokens/ETH)");
  } catch (err) {
    const msg = String((err as Error).message ?? "");
    if (msg.includes("PoolAlreadyInitialized") || msg.includes("0xefa10d52")) {
      logger.info("[TOKEN] Pool already initialized, continuing...");
    } else {
      throw new Error(`V4 pool init failed: ${msg}`);
    }
  }

  const poolKeyHash = computePoolId(tokenAddress, HOOK_ADDRESS);
  logger.info(`[TOKEN] Pool ID: ${poolKeyHash}`);

  // ── Step 5: seed token-only liquidity ────────────────────────────────────────
  // Position [TICK_LOWER=-887220, TICK_UPPER=69000]: pool_tick (69060) > TICK_UPPER (69000)
  // → entire position is token1 (ERC-404), zero ETH needed.
  logger.info("[TOKEN] Computing liquidity for token-only seed position...");
  const liquidity = computeLiquidityForTokens(TOKEN_SUPPLY, TICK_LOWER_SEED, TICK_UPPER_SEED);
  logger.info(`[TOKEN] Liquidity L = ${liquidity}`);

  const unlockData = buildSeedLiquidityCalldata(tokenAddress, HOOK_ADDRESS, account.address, liquidity);
  const deadline   = BigInt(Math.floor(Date.now() / 1000) + 600);

  logger.info("[TOKEN] Seeding V4 token-only liquidity (0 ETH, 6900 tokens)...");
  const liquidityTxHash = await walletClient.writeContract({
    account,
    address: V4_POSITION_MANAGER,
    abi: POSITION_MANAGER_ABI,
    functionName: "modifyLiquidities",
    args: [unlockData, deadline],
    value: 0n,   // token-only — no ETH
    chain,
    ...gas,
  });
  await waitTx(publicClient, liquidityTxHash, "V4 seed token-only liquidity");
  logger.info("[TOKEN] Liquidity seeded: 6900 tokens, 0 ETH ✓");

  // ── Step 6: register pool in hook (onlyOwner) ─────────────────────────────
  logger.info("[TOKEN] Registering pool in SubframeSwapHookV2...");
  const hookRegHash = await walletClient.writeContract({
    account,
    address: HOOK_ADDRESS,
    abi: HOOK_REGISTER_ABI,
    functionName: "registerPool",
    args: [poolKeyHash, creatorWallet, treasury],
    gas: 100_000n,
    chain,
    ...gas,
  });
  await waitTx(publicClient, hookRegHash, "hook.registerPool");
  logger.info("[TOKEN] Pool registered in hook ✓");

  return {
    contractAddress: tokenAddress,
    artTokenId:      "0",
    createTxHash:    cloneHash,
    tokenAddress,
    tokenTxHash:     cloneHash,
    pairAddress:     poolKeyHash,
    liquidityTxHash,
  };
}

/** Update an existing ERC-404 clone's baseURI on-chain. Platform wallet must be minter. */
export async function setTokenBaseUri(
  tokenAddress: Address,
  baseUri: string,
): Promise<string> {
  const rawKey = process.env["ENS_PRIVATE_KEY"];
  if (!rawKey) throw new Error("ENS_PRIVATE_KEY not set");
  const privateKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const account   = privateKeyToAccount(privateKey);
  const rpcUrl    = RPC_URL;

  const wallet = createWalletClient({ account, chain: mainnet, transport: http(rpcUrl) });
  const pub    = createPublicClient({ chain: mainnet, transport: http(rpcUrl) });

  const hash = await wallet.writeContract({
    address:      tokenAddress,
    abi:          ERC404_IMPL_ABI,
    functionName: "setBaseURI",
    args:         [baseUri],
  });

  await pub.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Re-approve PERMIT2 for the correct PositionManager and reseed V4 liquidity.
 * Used when a previous seed call went to wrong contract (e.g. Sepolia POSM on mainnet).
 * Assumes platform wallet still holds the full TOKEN_SUPPLY (6900 tokens).
 */
export async function reseedTokenLiquidity(
  tokenAddress: Address,
  creatorWallet: Address,
  treasury: Address,
): Promise<{ permit2TxHash: string; liquidityTxHash: string; hookRegHash: string }> {
  const rawKey = process.env["ENS_PRIVATE_KEY"];
  if (!rawKey) throw new Error("ENS_PRIVATE_KEY not set");
  if (!HOOK_ADDRESS || HOOK_ADDRESS === zeroAddress)
    throw new Error("HOOK_ADDRESS env var not set");

  const privateKey = (rawKey.startsWith("0x") ? rawKey : `0x${rawKey}`) as `0x${string}`;
  const account     = privateKeyToAccount(privateKey);
  const chain       = IS_SEPOLIA ? sepolia : mainnet;

  const publicClient = createPublicClient({ chain, transport: http(RPC_URL) });
  const walletClient = createWalletClient({ account, chain, transport: http(RPC_URL) });

  const gas = await gasParams(publicClient);

  logger.info(`[RESEED] tokenAddress: ${tokenAddress}`);
  logger.info(`[RESEED] V4_POSITION_MANAGER: ${V4_POSITION_MANAGER}`);

  // Step 1: Re-approve PERMIT2 → correct PositionManager
  logger.info("[RESEED] Re-approving PERMIT2 → PositionManager...");
  const expiration = BigInt(Math.floor(Date.now() / 1000) + 365 * 24 * 3600);
  const permit2TxHash = await walletClient.writeContract({
    account,
    address: PERMIT2,
    abi: PERMIT2_APPROVE_ABI,
    functionName: "approve",
    args: [tokenAddress, V4_POSITION_MANAGER, MAX_UINT160, Number(expiration)],
    gas: 200_000n,
    chain,
    ...gas,
  });
  await waitTx(publicClient, permit2TxHash, "permit2.approve(token, positionManager)");

  // Step 2: Seed token-only liquidity
  const liquidity  = computeLiquidityForTokens(TOKEN_SUPPLY, TICK_LOWER_SEED, TICK_UPPER_SEED);
  const unlockData = buildSeedLiquidityCalldata(tokenAddress, HOOK_ADDRESS, account.address, liquidity);
  const deadline   = BigInt(Math.floor(Date.now() / 1000) + 600);

  logger.info(`[RESEED] Liquidity L = ${liquidity}`);
  logger.info("[RESEED] Seeding token-only liquidity (0 ETH, 6900 tokens)...");

  const liquidityTxHash = await walletClient.writeContract({
    account,
    address: V4_POSITION_MANAGER,
    abi: POSITION_MANAGER_ABI,
    functionName: "modifyLiquidities",
    args: [unlockData, deadline],
    value: 0n,
    gas: 2_000_000n,
    chain,
    ...gas,
  });
  await waitTx(publicClient, liquidityTxHash, "V4 reseed token-only liquidity");

  // Step 3: Re-register pool in hook (idempotent — overwrite is fine)
  const poolKeyHash = computePoolId(tokenAddress, HOOK_ADDRESS);
  logger.info("[RESEED] Re-registering pool in SubframeSwapHookV2...");
  const hookRegHash = await walletClient.writeContract({
    account,
    address: HOOK_ADDRESS,
    abi: HOOK_REGISTER_ABI,
    functionName: "registerPool",
    args: [poolKeyHash, creatorWallet, treasury],
    gas: 100_000n,
    chain,
    ...gas,
  });
  await waitTx(publicClient, hookRegHash, "hook.registerPool");

  logger.info("[RESEED] Done. Pool reseeded with 6900 tokens ✓");
  return { permit2TxHash, liquidityTxHash, hookRegHash };
}

export function buildTokenMeta(subdomainName: string): {
  tokenName: string;
  tokenSymbol: string;
} {
  const clean = subdomainName.toLowerCase().replace(/[^a-z0-9]/g, "");
  const cap   = clean.charAt(0).toUpperCase() + clean.slice(1);
  const upper = clean.toUpperCase();
  return {
    tokenName:   cap,
    tokenSymbol: upper.length <= 6 ? upper : upper.slice(0, 6),
  };
}
