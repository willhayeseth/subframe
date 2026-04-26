// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SubframeSwapHook
 * @notice Uniswap V4 hook that charges 1% on each swap in a Subframe art-token pool,
 *         splitting the fee 50/50 between the subdomain creator and the protocol treasury.
 *
 * ADDRESS REQUIREMENT (Uniswap V4 hook flags):
 *   The deployed address must satisfy:
 *     (uint160(address(this)) & 0x3FFF) == 0x0044
 *   Meaning bits 6 (AFTER_SWAP = 0x0040) and bit 2 (AFTER_SWAP_RETURNS_DELTA = 0x0004)
 *   must be set, and all other hook-permission bits (0-13) must be zero.
 *   Deploy via CREATE2 with a mined salt using the SubframeHookDeployer or the
 *   Arachnid deterministic deployer (0x4e59b44847b379578588920cA78FbF26c0B4956C).
 *
 * USAGE:
 *   1. Deploy once per chain; store address as ART_HOOK_ADDRESS env var.
 *   2. After creating each pool, call registerPool(poolId, creator, treasury).
 *   3. Use this address as the `hooks` field in the Uniswap V4 PoolKey.
 *
 * SECURITY:
 *   Only the contract owner can register pools.
 *   Only the PoolManager can invoke afterSwap.
 */

// ─── Minimal V4 type definitions (no external imports required) ───────────────

/// @dev PoolKey struct as defined in Uniswap V4 PoolKey.sol
struct PoolKey {
    address currency0;
    address currency1;
    uint24  fee;
    int24   tickSpacing;
    address hooks;
}

/// @dev SwapParams as defined in IPoolManager.sol
struct SwapParams {
    bool    zeroForOne;
    int256  amountSpecified;
    uint160 sqrtPriceLimitX96;
}

/**
 * @dev BalanceDelta is int256; upper 128 bits = amount0, lower 128 bits = amount1.
 *      Positive = tokens flow FROM pool TO user; negative = FROM user TO pool.
 */
type BalanceDelta is int256;

interface IPoolManager {
    /// @notice Take tokens out of the PoolManager's custody and send to `to`.
    function take(address currency, address to, uint256 amount) external;
}

// ─── Hook contract ────────────────────────────────────────────────────────────

contract SubframeSwapHook {

    IPoolManager public immutable poolManager;
    address      public           owner;

    /// @dev Fee rate in basis points: 100 bps = 1%.
    uint256 public constant FEE_BPS = 100;

    struct PoolConfig {
        address creator;    // receives 0.5% of each swap
        address treasury;   // receives 0.5% of each swap
    }

    /// @dev poolId (keccak256 of PoolKey fields) => fee config
    mapping(bytes32 => PoolConfig) public pools;

    /// @dev Cumulative fees collected per recipient (for transparency/auditing)
    mapping(address => uint256) public feesCollected;

    // ─── Events ───────────────────────────────────────────────────────────────

    event PoolRegistered(bytes32 indexed poolId, address creator, address treasury);
    event FeeCollected(bytes32 indexed poolId, address creator, uint256 creatorAmt, address treasury, uint256 treasuryAmt);
    event OwnershipTransferred(address indexed previous, address indexed next);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotPoolManager();
    error NotOwner();
    error ZeroAddress();

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _poolManager) {
        if (_poolManager == address(0)) revert ZeroAddress();
        poolManager = IPoolManager(_poolManager);
        owner       = msg.sender;
        emit OwnershipTransferred(address(0), msg.sender);
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyPoolManager() {
        if (msg.sender != address(poolManager)) revert NotPoolManager();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    /// @notice Register fee recipients for a pool.
    /// @param poolId   keccak256(abi.encode(poolKey fields)) — matches V4 PoolId.toId()
    /// @param creator  Subdomain creator wallet (receives 0.5%)
    /// @param treasury Protocol treasury wallet (receives 0.5%)
    function registerPool(bytes32 poolId, address creator, address treasury) external onlyOwner {
        if (creator == address(0) || treasury == address(0)) revert ZeroAddress();
        pools[poolId] = PoolConfig(creator, treasury);
        emit PoolRegistered(poolId, creator, treasury);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    // ─── Hook permissions (for V4 Hooks.validateHookPermissions) ─────────────

    /// @notice Returns the flags this hook uses, matching address bits 0-13.
    ///         0x0044 = AFTER_SWAP (bit 6) | AFTER_SWAP_RETURNS_DELTA (bit 2)
    function getHookPermissions() external pure returns (uint256) {
        return 0x0044;
    }

    // ─── afterSwap — core fee logic ───────────────────────────────────────────

    /**
     * @notice Called by PoolManager after every swap in a registered pool.
     *
     * Fee flow:
     *   1. Determine the output currency and amount from `delta`.
     *   2. Calculate 1% fee (50% creator, 50% treasury).
     *   3. Return negative `hookDelta` so PoolManager reduces swapper's output by feeAmt.
     *   4. Call poolManager.take() to pull the fee out of PoolManager custody.
     *
     * @param key    The pool key (currency0, currency1, fee, tickSpacing, hooks).
     * @param params Swap direction and amount.
     * @param delta  BalanceDelta from the swap; positive = tokens leaving pool to swapper.
     * @return selector   Must be this.afterSwap.selector.
     * @return hookDelta  Negative = hook takes that amount from swapper output.
     */
    function afterSwap(
        address,
        PoolKey    calldata key,
        SwapParams calldata params,
        BalanceDelta        delta,
        bytes      calldata
    ) external onlyPoolManager returns (bytes4, int128) {
        bytes32 poolId = keccak256(abi.encode(
            key.currency0, key.currency1, key.fee, key.tickSpacing, key.hooks
        ));

        PoolConfig memory config = pools[poolId];
        if (config.creator == address(0)) {
            return (SubframeSwapHook.afterSwap.selector, 0);
        }

        // Determine output token and output amount from delta.
        // For zeroForOne (ETH -> token): output is currency1, delta.amount1 > 0
        // For !zeroForOne (token -> ETH): output is currency0, delta.amount0 > 0
        int128 outputDelta;
        address outputCurrency;

        if (params.zeroForOne) {
            outputDelta    = int128(BalanceDelta.unwrap(delta));          // lower 128 bits = amount1
            outputCurrency = key.currency1;
        } else {
            outputDelta    = int128(BalanceDelta.unwrap(delta) >> 128);   // upper 128 bits = amount0
            outputCurrency = key.currency0;
        }

        if (outputDelta <= 0) {
            return (SubframeSwapHook.afterSwap.selector, 0);
        }

        uint256 outputAmt  = uint256(uint128(outputDelta));
        uint256 feeAmt     = (outputAmt * FEE_BPS) / 10_000;   // 1%
        if (feeAmt < 2) {
            return (SubframeSwapHook.afterSwap.selector, 0);
        }

        uint256 creatorAmt  = feeAmt / 2;
        uint256 treasuryAmt = feeAmt - creatorAmt;

        // Pull fees from PoolManager; send directly to recipients
        poolManager.take(outputCurrency, config.creator,  creatorAmt);
        poolManager.take(outputCurrency, config.treasury, treasuryAmt);

        // Track cumulative fees
        feesCollected[config.creator]  += creatorAmt;
        feesCollected[config.treasury] += treasuryAmt;

        emit FeeCollected(poolId, config.creator, creatorAmt, config.treasury, treasuryAmt);

        // Return negative delta: swapper gets feeAmt less output
        return (SubframeSwapHook.afterSwap.selector, -int128(uint128(feeAmt)));
    }

    // ─── ERC-165 ──────────────────────────────────────────────────────────────

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7;
    }
}
