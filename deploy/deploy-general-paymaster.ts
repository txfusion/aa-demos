import { deployContract, getProvider, chargePaymaster } from "./utils";

export default async function () {
  const paymaster = await deployContract("GeneralPaymaster", []);
  await chargePaymaster(paymaster.address);

  const paymasterBalance = await getProvider().getBalance(paymaster.address);
  console.log(`Paymaster ETH balance is now ${paymasterBalance.toString()}`);
}
