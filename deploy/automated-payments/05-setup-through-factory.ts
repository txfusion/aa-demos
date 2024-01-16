import * as ethers from "ethers";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { Wallet } from "zksync-web3";
import * as hre from "hardhat";
import {
  DelegableAccount__factory,
  AutoPaymentFactory__factory,
} from "../../typechain";
import { ADDRESS } from "../../utils/constants";

const PRIVATE_KEY = process.env.PRIVATE_KEY as string;

const TRANSFER_AMOUNT = ethers.utils.parseEther("0.02");
const ALLOW_AMOUNT = ethers.utils.parseEther("0.001");
const DELEGABLE_ACCOUNT_1_ADDRESS = "0xcf9B0897Ec50b9AA6f71C8493BAFf0b91D8964Fd"
const DELEGABLE_ACCOUNT_2_ADDRESS = "0xb162c08688a684f751bfd3e59fe3d30e07d800c0"
const DELEGABLE_ACCOUNT_3_ADDRESS = "0xc39f6c1a7118f93d7686f9c4dc4912ded89422b3"

async function main() {
  const zkWallet = new Wallet(PRIVATE_KEY);
  const deployer = new Deployer(hre, zkWallet);

  const accountContract1 = new DelegableAccount__factory(
    deployer.zkWallet
  ).attach(DELEGABLE_ACCOUNT_1_ADDRESS);

  const accountContract2 = new DelegableAccount__factory(
    deployer.zkWallet
  ).attach(DELEGABLE_ACCOUNT_2_ADDRESS);

  const accountContract3 = new DelegableAccount__factory(
    deployer.zkWallet
  ).attach(DELEGABLE_ACCOUNT_3_ADDRESS);

  const autoPaymentFactoryContract = new AutoPaymentFactory__factory(
    deployer.zkWallet
  ).attach(ADDRESS.autopaymentfactory);

  // Supplying Delegable Accounts with ETH
  await (
    await deployer.zkWallet.sendTransaction({
      to: DELEGABLE_ACCOUNT_1_ADDRESS,
      value: TRANSFER_AMOUNT,
    })
  ).wait();

  await (
    await deployer.zkWallet.sendTransaction({
      to: DELEGABLE_ACCOUNT_2_ADDRESS,
      value: TRANSFER_AMOUNT,
    })
  ).wait();

  await (
    await deployer.zkWallet.sendTransaction({
      to: DELEGABLE_ACCOUNT_3_ADDRESS,
      value: TRANSFER_AMOUNT,
    })
  ).wait();

  console.log("=============================================");
    //create 3 autopayment contracts through the factory
    let tx = await autoPaymentFactoryContract.createNewAutoPayment()
    await tx.wait()

    tx = await autoPaymentFactoryContract.createNewAutoPayment()
    await tx.wait()

    tx = await autoPaymentFactoryContract.createNewAutoPayment()
    await tx.wait()

    const autopayment1 = await autoPaymentFactoryContract.autoPayments(0)
    const autopayment2 = await autoPaymentFactoryContract.autoPayments(1)
    const autopayment3 = await autoPaymentFactoryContract.autoPayments(2)

    console.log("autopayment1: ", autopayment1)
    console.log("autopayment2: ", autopayment2)
    console.log("autopayment3: ", autopayment3)

  // Add a new payee (time interval is 0 which represent first enum field of PaymentInterval struct (1 minute))
  tx = await accountContract1.addAllowedPayee(
    autopayment1,
    ALLOW_AMOUNT,
    0
  );

  let receipt = await tx.wait();
  console.log(receipt.status == 1 && "New Payee Added ✅");

  tx = await accountContract2.addAllowedPayee(
    autopayment1,
    ALLOW_AMOUNT,
    0
  );

  receipt = await tx.wait();
  console.log(receipt.status == 1 && "New Payee Added ✅");

  tx = await accountContract3.addAllowedPayee(
    autopayment2,
    ALLOW_AMOUNT,
    0
  );

  receipt = await tx.wait();
  console.log(receipt.status == 1 && "New Payee Added ✅");
}

main().catch((error) => {
  throw error;
});
