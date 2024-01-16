import { Provider, Wallet } from "zksync-web3";
import hre from "hardhat";
import { richWallet, deployContract } from "../../utils";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { ethers } from "ethers";
import { AutoPaymentFactory__factory, DelegableAccount__factory } from "../../typechain";
import { expect } from "chai";

const TESTNET_PROVIDER_URL = "http://localhost:8011";
const TRANSFER_AMOUNT = ethers.utils.parseEther("5");

describe("Payments integration test", async () => {
    let context
    async function setup() {
      const provider = new Provider(TESTNET_PROVIDER_URL);
  
      const deployerWallet = new Wallet(richWallet[0].privateKey, provider);
      const stranger = new Wallet(richWallet[1].privateKey, provider);
  
      const deployer = new Deployer(hre, deployerWallet);
  
      /**
       * Deployment
       */

      const autoPaymentFactoryContract = await deployContract(
        deployer,
        "AutoPaymentFactory",
        []
      )
  
      const delegableAccountContract = await deployContract(
        deployer,
        "DelegableAccount",
        [deployer.zkWallet.address]
      );
  
      /**
       * Funding DelegableAccount with ETH
       */
  
      await (
        await deployer.zkWallet.sendTransaction({
          to: delegableAccountContract.address,
          value: TRANSFER_AMOUNT,
        })
      ).wait();
  
      return {
        delegableAccount: new DelegableAccount__factory(deployer.zkWallet).attach(
          delegableAccountContract.address
        ),

        autoPaymentFactory: new AutoPaymentFactory__factory(deployer.zkWallet).attach(
            autoPaymentFactoryContract.address
        ),
        provider: deployerWallet.provider,
        deployerWallet,
        stranger,
      };
    }

    before(async () => {
        context = await setup()
    })

    it('deploy new autopayment through factory', async () => {
        const factory = context.autoPaymentFactory
        const tx = await factory.createNewAutoPayment()
        await tx.wait()
        const autoPayment = await factory.autoPayments(0)
        console.log("AutoPayment deployed through the factory: ", autoPayment);

        await expect(tx).to.emit(factory, "AutoPaymentCreated").withArgs(autoPayment)
    })

})