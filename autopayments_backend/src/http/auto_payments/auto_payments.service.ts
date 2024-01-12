import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { GraphQLClient } from "graphql-request";
import { AutoSubscription } from "./entities/auto_payments.entity";
import { subscriptionQuery } from "./queries/auto_payments.query";
import { ethers } from "ethers";
import { Wallet, Provider } from "zksync-web3";

const ZKSYNC_GRAPH_URI = "https://api.studio.thegraph.com/query/56765/auto-payments/v0.0.3"
require("dotenv").config();

const autoPaymentAddress = "0x4894153C857Be405A0994e58e3279541e33e6e07"
const abi = [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
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
          "name": "_subscriber",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "_timestamp",
          "type": "uint256"
        }
      ],
      "name": "LastChanged",
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
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "_subscriber",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "_timeInterval",
          "type": "uint256"
        }
      ],
      "name": "SubscriberAdded",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "_subscriber",
          "type": "address"
        }
      ],
      "name": "SubscriberRemoved",
      "type": "event"
    },
    {
      "inputs": [
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
      "name": "addSubscriber",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_subscriber",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_amount",
          "type": "uint256"
        }
      ],
      "name": "executePayment",
      "outputs": [],
      "stateMutability": "nonpayable",
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
        },
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
          "name": "",
          "type": "address"
        }
      ],
      "name": "lastCharged",
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
      "inputs": [],
      "name": "removeSubscriber",
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
    },
    {
      "inputs": [],
      "name": "withdraw",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "stateMutability": "payable",
      "type": "receive"
    }
  ]

@Injectable()
export class AutoPaymentService {
    client: GraphQLClient
    constructor() {
        this.client = new GraphQLClient(ZKSYNC_GRAPH_URI);
    }

    async getAllSubscriptions(): Promise<AutoSubscription[]> {
        try {
            const { autoSubscriptions } = <{ autoSubscriptions: AutoSubscription[] }> (
                await this.client.request(subscriptionQuery)
            )
            console.log("Subscriptions: ", autoSubscriptions)

            return autoSubscriptions
        } catch(e) {
            throw new InternalServerErrorException('Unable to get Greetings from Subgraph');
        }
    }

    async executeAutoPayments() {
        await setInterval(async ()=>{
            //query all subscriptions, if there is subscription with no lastPayment field, execute autopayment
            try {
                const { autoSubscriptions } = <{ autoSubscriptions: AutoSubscription[] }> (
                    await this.client.request(subscriptionQuery)
                )
                console.log("[EAP] Subscriptions: ", autoSubscriptions)
                let signer = new Wallet(process.env.PRIVATE_KEY, new Provider(process.env.ZKSYNC_RPC))
                let autoPaymentContract = new ethers.Contract(autoPaymentAddress, abi, signer)
                let tx
                const blockNumber = await signer.provider.getBlockNumber();
                const block = await signer.provider.getBlock(blockNumber);
                console.log("Current block timestamp: ", block.timestamp);
                for(let i = 0; i < autoSubscriptions.length; i ++){
                    console.log("[EAP] LastPayment[", i, "]: ", autoSubscriptions[i].lastPayment.toString())
                    //this will fails if the account doesn't have enough funds, or if allowance is not high enough
                    //should we check these conditions on the backend?
                    if(Number(autoSubscriptions[i].lastPayment) + Number(autoSubscriptions[i].timeInterval) < Number(block.timestamp)) {
                        //execute auto payment; interact with the chain thorugh ethers
                        console.log("Executing auto payment...[", autoSubscriptions[i].id, "]")
                        tx = await autoPaymentContract.executePayment(autoSubscriptions[i].id, autoSubscriptions[i].amount)
                        await tx.wait()
                    }
                }
            } catch(e) {
                console.log(e)
                // throw new InternalServerErrorException('Unable to get Greetings from Subgraph');
            }
        }, 10000)
    }

    async executeSomething() {
        try {
            let signer = new Wallet(process.env.PRIVATE_KEY, new Provider(process.env.ZKSYNC_RPC))
            let autoPaymentContract = new ethers.Contract(autoPaymentAddress, abi, signer)
            const result = await autoPaymentContract.lastCharged("0xc39F6c1A7118F93d7686f9c4dC4912DEd89422b3")
            console.log("[ES] Result: ", result.toString())
        } catch (error) {
            console.log(error)
            throw new InternalServerErrorException('Unable to execute something');
        }
    }
}