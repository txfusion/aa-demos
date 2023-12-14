import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { Wallet } from "zksync-web3";
import * as hre from "hardhat";

const PRIVATE_KEY = process.env.PRIVATE_KEY as string;

async function main() {
  const zkWallet = new Wallet(PRIVATE_KEY);
  const deployer = new Deployer(hre, zkWallet);
}

main().catch((error) => {
  throw error;
});
