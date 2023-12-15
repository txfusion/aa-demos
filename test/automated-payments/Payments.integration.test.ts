import hre from "hardhat";
import { assert, expect } from "chai";
import { Wallet, Provider, Contract, utils } from "zksync-web3";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { ethers } from "ethers";
import { describe } from "mocha";

import { richWallet } from "../../utils/rich_wallet";

import {
  DelegableAccount__factory,
  AutoPayment__factory,
  Account__factory,
} from "../../typechain";

const TESTNET_PROVIDER_URL = "http://localhost:8011";

const TRANSFER_AMOUNT = ethers.utils.parseEther("5");
const LIMIT_AMOUNT = ethers.utils.parseEther("1");

const GAS_LIMIT = { gasLimit: 10_000_000 };

const PAYMENT_PERIOD = {
  MINUTE: 0,
  DAILY: 1,
  WEEKLY: 2,
  MONTHLY: 3,
};

describe("Payments integration test", async () => {
  async function setup() {
    const provider = new Provider(TESTNET_PROVIDER_URL);

    const deployerWallet = new Wallet(richWallet[0].privateKey, provider);
    const stranger = new Wallet(richWallet[1].privateKey, provider);

    const deployer = new Deployer(hre, deployerWallet);

    const delegableAccountContractName = "DelegableAccount";
    const autoPaymentContractName = "AutoPayment";
    // this contract doesnt support IDelegableAccount
    const accountContractName = "Account";

    // Artifacts
    const delegableAccountArtifact = await deployer.loadArtifact(
      delegableAccountContractName
    );
    const autoPaymentArtifact = await deployer.loadArtifact(
      autoPaymentContractName
    );
    const accountArtifact = await deployer.loadArtifact(accountContractName);

    // Deployment
    const delegableAccountContract = await deployer.deploy(
      delegableAccountArtifact,
      [deployer.zkWallet.address]
    );
    const accountContract = await deployer.deploy(accountArtifact, [
      deployer.zkWallet.address,
    ]);

    const autoPaymentContract = await deployer.deploy(autoPaymentArtifact, []);

    // Supplying Delegable Account with ETH
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
      autoPayment: new AutoPayment__factory(deployer.zkWallet).attach(
        autoPaymentContract.address
      ),
      account: new Account__factory(deployer.zkWallet).attach(
        accountContract.address
      ),
      deployerWallet,
      stranger,
    };
  }

  let context: Awaited<ReturnType<typeof setup>>;

  before("Setting up the context", async () => {
    context = await setup();
  });

  it("should add payee/subscribe", async () => {
    const { delegableAccount, autoPayment } = context;
    await expect(
      delegableAccount.addAllowedPayee(
        autoPayment.address,
        LIMIT_AMOUNT,
        PAYMENT_PERIOD.MINUTE,
        GAS_LIMIT
      )
    ).to.be.fulfilled;

    const [accountAmountLimit, accountTimeLimit] =
      await delegableAccount.getPaymentConditions(autoPayment.address);

    const [autoPaymentAmountLimit, autoPaymentTimeLimit] =
      await autoPayment.getPaymentConditions(delegableAccount.address);

    expect(
      accountAmountLimit.eq(LIMIT_AMOUNT),
      "Amount limit on the delegable account contract should match the intended amount limit"
    );
    expect(
      autoPaymentAmountLimit.eq(LIMIT_AMOUNT),
      "Amount limit on the auto payment contract should match the intended amount limit"
    );

    expect(
      accountTimeLimit.eq(LIMIT_AMOUNT),
      "Time Interval on the delegable account contract should match the intended time interval"
    );
    expect(
      accountTimeLimit.eq(LIMIT_AMOUNT),
      "Time Interval on the auto payment contract should match the intended time interval"
    );
  });

  it("should execute pull payment - after subscribing", async () => {
    const { delegableAccount, autoPayment, deployerWallet } = context;
    const accountBalanceBeforePull = await deployerWallet.provider.getBalance(
      delegableAccount.address
    );

    await expect(
      autoPayment.executePayment(
        delegableAccount.address,
        LIMIT_AMOUNT,
        GAS_LIMIT
      )
    ).to.be.fulfilled;

    const accountBalanceAfterPull = await deployerWallet.provider.getBalance(
      delegableAccount.address
    );

    expect(
      accountBalanceAfterPull.add(LIMIT_AMOUNT).eq(accountBalanceBeforePull),
      "Wrong Delegable account balance after pull payment"
    );
  });

  it("should fail pull payment - wrong time", async () => {
    const { delegableAccount, autoPayment } = context;
  });

  it("should fail pull payment - wrong amount", async () => {
    const { delegableAccount, autoPayment } = context;
  });
  it("should remove payee/unsubscribe", async () => {
    const { delegableAccount, autoPayment } = context;
  });

  it("should add payee/unsubscribe locally - payee contract not compatible IAutoPayment", async () => {
    const { delegableAccount, autoPayment } = context;
  });
  it("should remove payee/unsubscribe locally - payee contract not compatible IAutoPayment", async () => {
    const { delegableAccount, autoPayment } = context;
  });

  // should add new payee
  // should execute pull payment
  // should fail pull payment - wrong time
  // should fail pull payment- wrong amount
  // should remove subscriber

  // should add new payee locally - payee not compatible interface
  // should remove new payee locally - payee not compatible interface
});
