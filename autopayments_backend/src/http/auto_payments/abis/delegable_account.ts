export const abi = [
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_owner",
          "type": "address"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "subscriber",
          "type": "address"
        }
      ],
      "name": "FailedAddingSubscriber",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidTimeInterval",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "payee",
          "type": "address"
        }
      ],
      "name": "AllowedPayeeAdded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "payee",
          "type": "address"
        }
      ],
      "name": "AllowedPayeeRemoved",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "subscriber",
          "type": "address"
        }
      ],
      "name": "FailedRemovingSubscriber",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "stateMutability": "nonpayable",
      "type": "fallback"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_payee",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        },
        {
          "internalType": "enum PaymentInterval",
          "name": "_timeInterval",
          "type": "uint8"
        }
      ],
      "name": "addAllowedPayee",
      "outputs": [],
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
      "name": "conditions",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "timeInterval",
          "type": "uint256"
        },
        {
          "internalType": "bool",
          "name": "isAllowed",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "_ethAmount",
          "type": "uint256"
        }
      ],
      "name": "executeAutoPayment",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "txType",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "from",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "to",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "gasLimit",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "gasPerPubdataByteLimit",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "maxFeePerGas",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "maxPriorityFeePerGas",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "paymaster",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "nonce",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "value",
              "type": "uint256"
            },
            {
              "internalType": "uint256[4]",
              "name": "reserved",
              "type": "uint256[4]"
            },
            {
              "internalType": "bytes",
              "name": "data",
              "type": "bytes"
            },
            {
              "internalType": "bytes",
              "name": "signature",
              "type": "bytes"
            },
            {
              "internalType": "bytes32[]",
              "name": "factoryDeps",
              "type": "bytes32[]"
            },
            {
              "internalType": "bytes",
              "name": "paymasterInput",
              "type": "bytes"
            },
            {
              "internalType": "bytes",
              "name": "reservedDynamic",
              "type": "bytes"
            }
          ],
          "internalType": "struct Transaction",
          "name": "_transaction",
          "type": "tuple"
        }
      ],
      "name": "executeTransaction",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "txType",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "from",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "to",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "gasLimit",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "gasPerPubdataByteLimit",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "maxFeePerGas",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "maxPriorityFeePerGas",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "paymaster",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "nonce",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "value",
              "type": "uint256"
            },
            {
              "internalType": "uint256[4]",
              "name": "reserved",
              "type": "uint256[4]"
            },
            {
              "internalType": "bytes",
              "name": "data",
              "type": "bytes"
            },
            {
              "internalType": "bytes",
              "name": "signature",
              "type": "bytes"
            },
            {
              "internalType": "bytes32[]",
              "name": "factoryDeps",
              "type": "bytes32[]"
            },
            {
              "internalType": "bytes",
              "name": "paymasterInput",
              "type": "bytes"
            },
            {
              "internalType": "bytes",
              "name": "reservedDynamic",
              "type": "bytes"
            }
          ],
          "internalType": "struct Transaction",
          "name": "_transaction",
          "type": "tuple"
        }
      ],
      "name": "executeTransactionFromOutside",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_payee",
          "type": "address"
        }
      ],
      "name": "getPaymentConditions",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
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
          "name": "_payee",
          "type": "address"
        }
      ],
      "name": "isExecutable",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_hash",
          "type": "bytes32"
        },
        {
          "internalType": "bytes",
          "name": "_signature",
          "type": "bytes"
        }
      ],
      "name": "isValidSignature",
      "outputs": [
        {
          "internalType": "bytes4",
          "name": "magic",
          "type": "bytes4"
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
        }
      ],
      "name": "lastPayment",
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
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "txType",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "from",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "to",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "gasLimit",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "gasPerPubdataByteLimit",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "maxFeePerGas",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "maxPriorityFeePerGas",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "paymaster",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "nonce",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "value",
              "type": "uint256"
            },
            {
              "internalType": "uint256[4]",
              "name": "reserved",
              "type": "uint256[4]"
            },
            {
              "internalType": "bytes",
              "name": "data",
              "type": "bytes"
            },
            {
              "internalType": "bytes",
              "name": "signature",
              "type": "bytes"
            },
            {
              "internalType": "bytes32[]",
              "name": "factoryDeps",
              "type": "bytes32[]"
            },
            {
              "internalType": "bytes",
              "name": "paymasterInput",
              "type": "bytes"
            },
            {
              "internalType": "bytes",
              "name": "reservedDynamic",
              "type": "bytes"
            }
          ],
          "internalType": "struct Transaction",
          "name": "_transaction",
          "type": "tuple"
        }
      ],
      "name": "payForTransaction",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "txType",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "from",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "to",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "gasLimit",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "gasPerPubdataByteLimit",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "maxFeePerGas",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "maxPriorityFeePerGas",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "paymaster",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "nonce",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "value",
              "type": "uint256"
            },
            {
              "internalType": "uint256[4]",
              "name": "reserved",
              "type": "uint256[4]"
            },
            {
              "internalType": "bytes",
              "name": "data",
              "type": "bytes"
            },
            {
              "internalType": "bytes",
              "name": "signature",
              "type": "bytes"
            },
            {
              "internalType": "bytes32[]",
              "name": "factoryDeps",
              "type": "bytes32[]"
            },
            {
              "internalType": "bytes",
              "name": "paymasterInput",
              "type": "bytes"
            },
            {
              "internalType": "bytes",
              "name": "reservedDynamic",
              "type": "bytes"
            }
          ],
          "internalType": "struct Transaction",
          "name": "_transaction",
          "type": "tuple"
        }
      ],
      "name": "prepareForPaymaster",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_payee",
          "type": "address"
        }
      ],
      "name": "removeAllowedPayee",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
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
      "stateMutability": "view",
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
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "_suggestedSignedHash",
          "type": "bytes32"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "txType",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "from",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "to",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "gasLimit",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "gasPerPubdataByteLimit",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "maxFeePerGas",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "maxPriorityFeePerGas",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "paymaster",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "nonce",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "value",
              "type": "uint256"
            },
            {
              "internalType": "uint256[4]",
              "name": "reserved",
              "type": "uint256[4]"
            },
            {
              "internalType": "bytes",
              "name": "data",
              "type": "bytes"
            },
            {
              "internalType": "bytes",
              "name": "signature",
              "type": "bytes"
            },
            {
              "internalType": "bytes32[]",
              "name": "factoryDeps",
              "type": "bytes32[]"
            },
            {
              "internalType": "bytes",
              "name": "paymasterInput",
              "type": "bytes"
            },
            {
              "internalType": "bytes",
              "name": "reservedDynamic",
              "type": "bytes"
            }
          ],
          "internalType": "struct Transaction",
          "name": "_transaction",
          "type": "tuple"
        }
      ],
      "name": "validateTransaction",
      "outputs": [
        {
          "internalType": "bytes4",
          "name": "magic",
          "type": "bytes4"
        }
      ],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "stateMutability": "payable",
      "type": "receive"
    }
  ]