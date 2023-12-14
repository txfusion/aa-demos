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

const TRANSFER_AMOUNT = ethers.utils.parseEther("3");
const ALLOW_AMOUNT = ethers.utils.parseEther("1");

async function main() {
  const zkWallet = new Wallet(PRIVATE_KEY);
  const deployer = new Deployer(hre, zkWallet);

  const accountContract = new DelegableAccount__factory(
    deployer.zkWallet
  ).attach(ADDRESS.delegableaccount);

  // Supplying Delegable Account with ETH
  await (
    await deployer.zkWallet.sendTransaction({
      to: ADDRESS.delegableaccount,
      value: TRANSFER_AMOUNT,
    })
  ).wait();

  const autoPaymentsContract = new AutoPayment__factory(
    deployer.zkWallet
  ).attach(ADDRESS.autopayment);

  let tx = await accountContract.addAllowedPayee(
    ADDRESS.autopayment,
    ALLOW_AMOUNT,
    0
  );
  await tx.wait();

  console.log("ADD ALLOW PAYEE FINISHED");

  const conditions = await accountContract.getPaymentConditions(
    ADDRESS.autopayment
  );
  console.log(conditions[0].toString(), conditions[1].toString());

  const autoPaymentConditions = await autoPaymentsContract.getPaymentConditions(
    ADDRESS.delegableaccount
  );
  console.log(
    autoPaymentConditions[0].toString(),
    autoPaymentConditions[1].toString()
  );

  let accountBalance = await deployer.zkWallet.provider.getBalance(
    accountContract.address
  );
  console.log("accountBalance", accountBalance.toString());

  tx = await autoPaymentsContract.executePayment(
    accountContract.address,
    ALLOW_AMOUNT,
    { gasLimit: 10_000_000 }
  );

  await tx.wait();

  console.log("EXECUTE PAYMENT PAYEE FINISHED");

  accountBalance = await deployer.zkWallet.provider.getBalance(
    accountContract.address
  );
  console.log("accountBalance", accountBalance.toString());

  tx = await autoPaymentsContract.executePayment(
    accountContract.address,
    ALLOW_AMOUNT,
    { gasLimit: 10_000_000 }
  );

  await tx.wait();

  console.log("EXECUTE PAYMENT PAYEE FINISHED");

  accountBalance = await deployer.zkWallet.provider.getBalance(
    accountContract.address
  );
  console.log("accountBalance", accountBalance.toString());
}

main().catch((error) => {
  throw error;
});
