import { Inject, Injectable, InternalServerErrorException, LoggerService  } from "@nestjs/common";
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { GraphQLClient } from "graphql-request";
import { AutoSubscription } from "./entities/auto_payments.entity";
import { subscriptionQuery, filteredSubscriptionsQuery } from "./queries/auto_payments.query";
import { ethers } from "ethers";
import { Wallet, Provider } from "zksync-web3";
import { Cron, CronExpression } from '@nestjs/schedule';
import { abi } from "./abis/auto_payment"
import { abi as delegableAccountAbi} from "./abis/delegable_account"
import { isExecutable } from "./utils";

const ZKSYNC_GRAPH_URI = "https://api.studio.thegraph.com/query/56765/auto-payments/v0.0.3"
require("dotenv").config();

const autoPaymentAddress = "0x4894153C857Be405A0994e58e3279541e33e6e07"

@Injectable()
export class AutoPaymentService {
    client: GraphQLClient
    signer: Wallet
    autoPaymentContract: ethers.Contract

    constructor(
        @Inject(WINSTON_MODULE_NEST_PROVIDER)
        private readonly logger: LoggerService
    ) {
        this.client = new GraphQLClient(ZKSYNC_GRAPH_URI);
        this.signer = new Wallet(process.env.PRIVATE_KEY, new Provider(process.env.ZKSYNC_RPC))
        this.autoPaymentContract = new ethers.Contract(autoPaymentAddress, abi, this.signer)
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

    // @Cron(CronExpression.EVERY_10_SECONDS)
    async getFilteredSubscriptions(): Promise<AutoSubscription[]> {
        try {
            const variables = {
                currentTimestamp: 12,
                balance: "1000000000000000",
            };
            const { autoSubscriptions } = <{ autoSubscriptions: AutoSubscription[] }> (
                await this.client.request(filteredSubscriptionsQuery, variables)
            )
            console.log("Subscriptions: ", autoSubscriptions)

            return autoSubscriptions
        } catch(e) {
            console.log(e)
            throw new InternalServerErrorException('Unable to get filtered subscriptions from Subgraph');
        }
    }

    // @Cron(CronExpression.EVERY_30_SECONDS)
    async executeAutoPayments() {
      //query all subscriptions, if there is subscription with no lastPayment field, execute autopayment
      try {
          //graphql should check the conditions
          const { autoSubscriptions } = <{ autoSubscriptions: AutoSubscription[] }> (
              await this.client.request(subscriptionQuery)
          )
          console.log("[EAP] Subscriptions: ", autoSubscriptions)
          
          let tx
          let receipt
          for(let i = 0; i < autoSubscriptions.length; i ++){
              console.log("[EAP] LastPayment[", i, "]: ", autoSubscriptions[i].lastPayment.toString())
              //this will fails if the account doesn't have enough funds, or if allowance is not high enough
              //should we check these conditions on the backend?
              if(await isExecutable(autoSubscriptions[i], this.signer)) {
                  //execute auto payment; interact with the chain thorugh ethers
                  console.log("Executing auto payment...[", autoSubscriptions[i].id, "]")
                  tx = await this.autoPaymentContract.executePayment(autoSubscriptions[i].id, autoSubscriptions[i].amount)
                  receipt = await tx.wait()
                  this.logger.log(`Transaction receipt: ${receipt}`);
                  console.log(receipt.status == 1 && "Execution successful ✅");
              }
          }
      } catch(e) {
          console.log(e)
          // throw new InternalServerErrorException('Unable to get Greetings from Subgraph');
      }
    }

    async removeSubscription(delegableAccountAddress: string) {
        try {
            const delegableAccount = new ethers.Contract(delegableAccountAddress, delegableAccountAbi, this.signer)
            const tx = await delegableAccount.removeAllowedPayee(autoPaymentAddress)
            const receipt = await tx.wait()
            this.logger.log(`Subscriber removed: ${receipt.toString()}`);
        } catch(e) {
            console.log(e)
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