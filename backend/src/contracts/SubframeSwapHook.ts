// AUTO-GENERATED
export const SWAP_HOOK_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_poolManager",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "NotOwner",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "NotPoolManager",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ZeroAddress",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "poolId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "creatorAmt",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "treasury",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "treasuryAmt",
        "type": "uint256"
      }
    ],
    "name": "FeeCollected",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previous",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "next",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "poolId",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "address",
        "name": "treasury",
        "type": "address"
      }
    ],
    "name": "PoolRegistered",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "FEE_BPS",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "components": [
          {
            "internalType": "address",
            "name": "currency0",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "currency1",
            "type": "address"
          },
          {
            "internalType": "uint24",
            "name": "fee",
            "type": "uint24"
          },
          {
            "internalType": "int24",
            "name": "tickSpacing",
            "type": "int24"
          },
          {
            "internalType": "address",
            "name": "hooks",
            "type": "address"
          }
        ],
        "internalType": "struct PoolKey",
        "name": "key",
        "type": "tuple"
      },
      {
        "components": [
          {
            "internalType": "bool",
            "name": "zeroForOne",
            "type": "bool"
          },
          {
            "internalType": "int256",
            "name": "amountSpecified",
            "type": "int256"
          },
          {
            "internalType": "uint160",
            "name": "sqrtPriceLimitX96",
            "type": "uint160"
          }
        ],
        "internalType": "struct SwapParams",
        "name": "params",
        "type": "tuple"
      },
      {
        "internalType": "BalanceDelta",
        "name": "delta",
        "type": "int256"
      },
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "name": "afterSwap",
    "outputs": [
      {
        "internalType": "bytes4",
        "name": "",
        "type": "bytes4"
      },
      {
        "internalType": "int128",
        "name": "",
        "type": "int128"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "feesCollected",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getHookPermissions",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "poolManager",
    "outputs": [
      {
        "internalType": "contract IPoolManager",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "pools",
    "outputs": [
      {
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "treasury",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "poolId",
        "type": "bytes32"
      },
      {
        "internalType": "address",
        "name": "creator",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "treasury",
        "type": "address"
      }
    ],
    "name": "registerPool",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes4",
        "name": "interfaceId",
        "type": "bytes4"
      }
    ],
    "name": "supportsInterface",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;
export const SWAP_HOOK_BYTECODE = "0x60a060405234801561000f575f5ffd5b50604051610b62380380610b6283398101604081905261002e916100a6565b6001600160a01b0381166100555760405163d92e233d60e01b815260040160405180910390fd5b6001600160a01b0381166080525f80546001600160a01b0319163390811782556040519091907f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0908290a3506100d3565b5f602082840312156100b6575f5ffd5b81516001600160a01b03811681146100cc575f5ffd5b9392505050565b608051610a626101005f395f81816101e10152818161031b0152818161054701526105d10152610a625ff3fe608060405234801561000f575f5ffd5b506004361061009b575f3560e01c8063b5217bb411610063578063b5217bb41461017a578063bf333f2c146101cd578063c4e833ce146101d5578063dc4c90d3146101dc578063f2fde38b14610203575f5ffd5b806301ffc9a71461009f5780635b2478ea146100d857806372383d29146101055780638da5cb5b1461011a578063b47b2fb114610144575b5f5ffd5b6100c36100ad3660046107b7565b6001600160e01b0319166301ffc9a760e01b1490565b60405190151581526020015b60405180910390f35b6100f76100e6366004610800565b60026020525f908152604090205481565b6040519081526020016100cf565b610118610113366004610819565b610216565b005b5f5461012c906001600160a01b031681565b6040516001600160a01b0390911681526020016100cf565b610157610152366004610852565b61030e565b604080516001600160e01b03199093168352600f9190910b6020830152016100cf565b6101ad610188366004610911565b600160208190525f918252604090912080549101546001600160a01b03918216911682565b604080516001600160a01b039384168152929091166020830152016100cf565b6100f7606481565b60446100f7565b61012c7f000000000000000000000000000000000000000000000000000000000000000081565b610118610211366004610800565b61070d565b5f546001600160a01b03163314610240576040516330cd747160e01b815260040160405180910390fd5b6001600160a01b038216158061025d57506001600160a01b038116155b1561027b5760405163d92e233d60e01b815260040160405180910390fd5b6040805180820182526001600160a01b0384811680835284821660208085018281525f8a8152600180845290889020965187549087166001600160a01b03199182161788559151960180549690951695169490941790925583519081529182015284917ffafdbdd88ac30f0aa936e576be61816ea751908540523fa81b80c4a406ad7bec910160405180910390a2505050565b5f80336001600160a01b037f000000000000000000000000000000000000000000000000000000000000000016146103595760405163570c108560e11b815260040160405180910390fd5b5f6103676020890189610800565b61037760408a0160208b01610800565b61038760608b0160408c01610928565b61039760808c0160608d0161094a565b6103a760a08d0160808e01610800565b604080516001600160a01b0396871660208201529486169085015262ffffff909216606084015260020b60808301529190911660a082015260c00160408051601f1981840301815282825280516020918201205f81815260018084529084902085850190945283546001600160a01b03908116808752949091015416918401919091529250610445575063b47b2fb160e01b92505f91506107029050565b5f8061045460208b018b61096a565b156104735788915061046c60408c0160208d01610800565b905061048a565b608089901d915061048760208c018c610800565b90505b5f82600f0b136104ab575063b47b2fb160e01b94505f935061070292505050565b6fffffffffffffffffffffffffffffffff82165f6127106104cd60648461099d565b6104d791906109ba565b905060028110156104fb575063b47b2fb160e01b96505f9550610702945050505050565b5f6105076002836109ba565b90505f61051482846109d9565b8751604051630b0d9c0960e01b81526001600160a01b0388811660048301529182166024820152604481018590529192507f00000000000000000000000000000000000000000000000000000000000000001690630b0d9c09906064015f604051808303815f87803b158015610588575f5ffd5b505af115801561059a573d5f5f3e3d5ffd5b505050506020870151604051630b0d9c0960e01b81526001600160a01b0387811660048301529182166024820152604481018390527f000000000000000000000000000000000000000000000000000000000000000090911690630b0d9c09906064015f604051808303815f87803b158015610614575f5ffd5b505af1158015610626573d5f5f3e3d5ffd5b505088516001600160a01b03165f90815260026020526040812080548694509092506106539084906109ec565b90915550506020808801516001600160a01b03165f90815260029091526040812080548392906106849084906109ec565b90915550508651602080890151604080516001600160a01b03948516815292830186905292168183015260608101839052905189917f8a3e0ca4dfc45024c43a8b0798cd80ac112dd7158494da00a2693ce85a8fb4dc919081900360800190a263b47b2fb160e01b6106f5846109ff565b9950995050505050505050505b965096945050505050565b5f546001600160a01b03163314610737576040516330cd747160e01b815260040160405180910390fd5b6001600160a01b03811661075e5760405163d92e233d60e01b815260040160405180910390fd5b5f80546040516001600160a01b03808516939216917f8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e091a35f80546001600160a01b0319166001600160a01b0392909216919091179055565b5f602082840312156107c7575f5ffd5b81356001600160e01b0319811681146107de575f5ffd5b9392505050565b80356001600160a01b03811681146107fb575f5ffd5b919050565b5f60208284031215610810575f5ffd5b6107de826107e5565b5f5f5f6060848603121561082b575f5ffd5b8335925061083b602085016107e5565b9150610849604085016107e5565b90509250925092565b5f5f5f5f5f5f868803610160811215610869575f5ffd5b610872886107e5565b965060a0601f1982011215610885575f5ffd5b602088019550606060bf198201121561089c575f5ffd5b5060c087019350610120870135925061014087013567ffffffffffffffff8111156108c5575f5ffd5b8701601f810189136108d5575f5ffd5b803567ffffffffffffffff8111156108eb575f5ffd5b8960208284010111156108fc575f5ffd5b60208201935080925050509295509295509295565b5f60208284031215610921575f5ffd5b5035919050565b5f60208284031215610938575f5ffd5b813562ffffff811681146107de575f5ffd5b5f6020828403121561095a575f5ffd5b81358060020b81146107de575f5ffd5b5f6020828403121561097a575f5ffd5b813580151581146107de575f5ffd5b634e487b7160e01b5f52601160045260245ffd5b80820281158282048414176109b4576109b4610989565b92915050565b5f826109d457634e487b7160e01b5f52601260045260245ffd5b500490565b818103818111156109b4576109b4610989565b808201808211156109b4576109b4610989565b5f81600f0b6f7fffffffffffffffffffffffffffffff198103610a2457610a24610989565b5f039291505056fea26469706673582212201abfc14c9a62fe799c38a97af5d69d82bf75367f952b78024149db1beea2e14a64736f6c63430008220033" as `0x${string}`;
