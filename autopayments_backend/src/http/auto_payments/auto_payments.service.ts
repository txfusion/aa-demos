import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { GraphQLClient } from "graphql-request";
import { AutoSubscription } from "./entities/auto_payments.entity";
import { subscriptionQuery } from "./queries/auto_payments.query";
import { ethers } from "ethers";
import { Wallet, Provider } from "zksync-web3";
import { Cron, CronExpression } from '@nestjs/schedule';
import { abi } from "./abis/auto_payment"

const ZKSYNC_GRAPH_URI = "https://api.studio.thegraph.com/query/56765/auto-payments/v0.0.3"
require("dotenv").config();

const autoPaymentAddress = "0x4894153C857Be405A0994e58e3279541e33e6e07"

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

    @Cron(CronExpression.EVERY_10_SECONDS)
    async executeAutoPayments() {
      //query all subscriptions, if there is subscription with no lastPayment field, execute autopayment
      try {
          //graphql should check the conditions
          const { autoSubscriptions } = <{ autoSubscriptions: AutoSubscription[] }> (
              await this.client.request(subscriptionQuery)
          )
          console.log("[EAP] Subscriptions: ", autoSubscriptions)
          let signer = new Wallet(process.env.PRIVATE_KEY, new Provider(process.env.ZKSYNC_RPC))
          let autoPaymentContract = new ethers.Contract(autoPaymentAddress, abi, signer)
          let tx
          let receipt
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
                  receipt = await tx.wait()
                  console.log(receipt.status == 1 && "Execution successful ✅");
              }
          }
      } catch(e) {
          console.log(e)
          // throw new InternalServerErrorException('Unable to get Greetings from Subgraph');
      }
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