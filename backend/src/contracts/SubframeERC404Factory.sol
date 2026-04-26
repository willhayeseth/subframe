// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SubframeERC404Factory
 * @notice Deploys minimal EIP-1167 clones of SubframeERC404Impl.
 *         Deploy this contract once; all subdomain tokens are clones.
 */

interface ISubframeERC404Impl {
    function initialize(
        string  memory _name,
        string  memory _symbol,
        address _creator,
        address _treasury,
        address _liquidityRecipient,
        string  memory _baseURI
    ) external;
}

library Clones {
    /**
     * @dev Deploys and returns the address of a clone that mimics the
     *      behaviour of `implementation`.
     *      This function uses the create opcode, which should never revert.
     */
    function clone(address implementation) internal returns (address instance) {
        assembly {
            mstore(0x00, or(
                shr(0xe8, shl(0x60, implementation)),
                0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000
            ))
            mstore(0x20, or(
                0x5af43d82803e903d91602b57fd5bf3,
                shl(0x78, implementation)
            ))
            instance := create(0, 0x09, 0x37)
        }
        require(instance != address(0), "ERC1167: create failed");
    }
}

contract SubframeERC404Factory {
    address public immutable implementation;
    address public owner;

    event TokenCreated(
        address indexed clone,
        address indexed creator,
        string  name,
        string  symbol
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "not owner");
        _;
    }

    constructor(address _implementation) {
        implementation = _implementation;
        owner = msg.sender;
    }

    /**
     * @notice Clone the implementation and initialise it for a new subdomain.
     * @param _name    ERC-20 token name
     * @param _symbol  ERC-20 token symbol
     * @param _creator Subdomain owner wallet (receives 10% supply)
     * @param _treasury Protocol treasury address (receives fees)
     * @param _baseURI Base URI for NFT metadata (e.g. "ipfs://Qm.../")
     * @return clone   Address of the newly deployed token contract
     */
    function createToken(
        string  calldata _name,
        string  calldata _symbol,
        address _creator,
        address _treasury,
        string  calldata _baseURI
    ) external returns (address clone) {
        clone = Clones.clone(implementation);
        ISubframeERC404Impl(clone).initialize(
            _name,
            _symbol,
            _creator,
            _treasury,
            msg.sender, // liquidity tokens go to the caller (protocol wallet)
            _baseURI
        );
        emit TokenCreated(clone, _creator, _name, _symbol);
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero address");
        owner = newOwner;
    }
}
