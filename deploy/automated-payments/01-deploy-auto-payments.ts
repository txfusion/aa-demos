import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { Wallet } from "zksync-web3";
import * as hre from "hardhat";

const PRIVATE_KEY = process.env.PRIVATE_KEY as string;

async function main() {
  const zkWallet = new Wallet(PRIVATE_KEY);
  const deployer = new Deployer(hre, zkWallet);

  const accountContractName = "DelegableAccount";
  const autoPaymentContractName = "AutoPayment";

  const accountArtifact = await deployer.loadArtifact(accountContractName);
  const autoPaymentArtifact = await deployer.loadArtifact(
    autoPaymentContractName
  );

  const accountContract = await deployer.deploy(accountArtifact, [
    deployer.zkWallet.address,
  ]);
  const autoPaymentContract = await deployer.deploy(autoPaymentArtifact, []);

  console.log(
    `${accountContractName.toLowerCase()}: "${accountContract.address}",`
  );
  console.log(
    `${autoPaymentContractName.toLowerCase()}: "${
      autoPaymentContract.address
    }",`
  );
}

main().catch((error) => {
  throw error;
});
