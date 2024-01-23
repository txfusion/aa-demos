import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { Wallet } from "zksync-web3";
import * as hre from "hardhat";
import { deployContract } from "../../utils/deployment";

const PRIVATE_KEY = process.env.PRIVATE_KEY as string;

async function main() {
  const zkWallet = new Wallet(PRIVATE_KEY);
  const deployer = new Deployer(hre, zkWallet);

  await deployContract(
    deployer,
    "DelegableAccount",
    [deployer.zkWallet.address],
    true
  );
  await deployContract(deployer, "AutoPayment", [], true);
}

main().catch((error) => {
  throw error;
});
