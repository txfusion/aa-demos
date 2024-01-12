import * as ethers from "ethers";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { Wallet } from "zksync-web3";
import * as hre from "hardhat";
import {
  DelegableAccount__factory,
  AutoPayment__factory,
} from "../../typechain";
import { ADDRESS } from "../../utils/constants";

const PRIVATE_KEY = process.env.PRIVATE_KEY as string;

const TRANSFER_AMOUNT = ethers.utils.parseEther("0.05");
const ALLOW_AMOUNT = ethers.utils.parseEther("0.001");
const TIME_INTERVAL = 60;
const DELEGABLE_ACCOUNT_ADDRESS = "0xB162C08688a684f751BFd3E59fe3D30e07d800C0"

async function main() {
  const zkWallet = new Wallet(PRIVATE_KEY);
  const deployer = new Deployer(hre, zkWallet);

  const accountContract = new DelegableAccount__factory(
    deployer.zkWallet
  ).attach(DELEGABLE_ACCOUNT_ADDRESS);

  const autoPaymentsContract = new AutoPayment__factory(
    deployer.zkWallet
  ).attach(ADDRESS.autopayment);

  // Supplying Delegable Account with ETH
  await (
    await deployer.zkWallet.sendTransaction({
      to: DELEGABLE_ACCOUNT_ADDRESS,
      value: TRANSFER_AMOUNT,
    })
  ).wait();

  console.log("=============================================");

  // Add a new payee
  let tx = await accountContract.addAllowedPayee(
    ADDRESS.autopayment,
    ALLOW_AMOUNT,
    TIME_INTERVAL
  );

  let receipt = await tx.wait();
  console.log(receipt.status == 1 && "New Payee Added ✅");

  /**
   * Conditions of Auto Payment
   */
  const accountConditions = await accountContract.getPaymentConditions(
    ADDRESS.autopayment
  );

  console.log("\n----> Delegable Account - Payment Conditions <----");

  console.log("Amount: ", accountConditions[0].toString(), "🚧");
  console.log("Time interval: ", accountConditions[1].toString(), "⏰");

  const autoPaymentConditions = await autoPaymentsContract.getPaymentConditions(
    DELEGABLE_ACCOUNT_ADDRESS
  );
  console.log("\n----> Auto Payments - Payment Conditions <----");
  console.log("Amount: ", autoPaymentConditions[0].toString(), "🚧");
  console.log("Time interval: ", autoPaymentConditions[1].toString(), "⏰");

  // account balance before pull payment
  let accountBalance = await deployer.zkWallet.provider.getBalance(
    accountContract.address
  );
  console.log(
    "\n*Account balance 💸 - before pull payment",
    accountBalance.toString()
  );

  // /**
  //  * Pull Payment Execution
  //  */
  // tx = await autoPaymentsContract.executePayment(
  //   accountContract.address,
  //   ALLOW_AMOUNT,
  //   { gasLimit: 10_000_000 }
  // );

  // receipt = await tx.wait();
  // console.log(receipt.status == 1 && "\nPull Payment Executed ✅");

  // // account balance after pull payment
  // accountBalance = await deployer.zkWallet.provider.getBalance(
  //   accountContract.address
  // );
  // console.log(
  //   "\n*Account balance 💸 - after pull payment",
  //   accountBalance.toString()
  // );
}

main().catch((error) => {
  throw error;
});
