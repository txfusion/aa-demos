import hre from "hardhat";
import { expect } from "chai";
import { Wallet, Provider } from "zksync-web3";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { ethers } from "ethers";
import { describe } from "mocha";

import { richWallet } from "../../utils/rich_wallet";

import {
  DelegableAccount__factory,
  DelegableAccountStub__factory,
  AutoPayment__factory,
  AutoPaymentStub__factory,
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

    /**
     * Names
     */

    const delegableAccountContractName = "DelegableAccount";
    // this contract doesnt support IDelegableAccount
    const stubDelegableAccountContractName = "DelegableAccountStub";

    const autoPaymentContractName = "AutoPayment";
    const stubAutoPaymentContractName = "AutoPaymentStub";

    /**
     * Artifacts
     */

    // Accounts
    const delegableAccountArtifact = await deployer.loadArtifact(
      delegableAccountContractName
    );

    const stubDelegableAccountArtifact = await deployer.loadArtifact(
      stubDelegableAccountContractName
    );

    // Auto Payment
    const autoPaymentArtifact = await deployer.loadArtifact(
      autoPaymentContractName
    );
    const stubAutoPaymentArtifact = await deployer.loadArtifact(
      stubAutoPaymentContractName
    );

    /**
     * Deployment
     */

    // Account
    const delegableAccountContract = await deployer.deploy(
      delegableAccountArtifact,
      [deployer.zkWallet.address]
    );

    const stubDelegableAccountContract = await deployer.deploy(
      stubDelegableAccountArtifact,
      [deployer.zkWallet.address]
    );

    // Auto Payment
    const autoPaymentContract = await deployer.deploy(autoPaymentArtifact, []);
    const stubAutoPaymentContract = await deployer.deploy(
      stubAutoPaymentArtifact,
      []
    );

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
      stubDelegableAccount: new DelegableAccountStub__factory(
        deployer.zkWallet
      ).attach(stubDelegableAccountContract.address),
      autoPayment: new AutoPayment__factory(deployer.zkWallet).attach(
        autoPaymentContract.address
      ),
      stubAutoPayment: new AutoPaymentStub__factory(deployer.zkWallet).attach(
        stubAutoPaymentContract.address
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
      autoPaymentTimeLimit.eq(LIMIT_AMOUNT),
      "Time Interval on the auto payment contract should match the intended time interval"
    );
  });

  it("should execute pull payment - after subscribing", async () => {
    const { delegableAccount, autoPayment, deployerWallet } = context;
    const accountBalanceBeforePull = await deployerWallet.provider.getBalance(
      delegableAccount.address
    );
    const autoPaymentBalanceBeforePull =
      await deployerWallet.provider.getBalance(autoPayment.address);

    await expect(
      autoPayment.executePayment(delegableAccount.address, LIMIT_AMOUNT)
    ).to.be.fulfilled;

    const accountBalanceAfterPull = await deployerWallet.provider.getBalance(
      delegableAccount.address
    );
    const autoPaymentBalanceAfterPull =
      await deployerWallet.provider.getBalance(autoPayment.address);

    expect(
      accountBalanceAfterPull.add(LIMIT_AMOUNT).eq(accountBalanceBeforePull),
      "Wrong Delegable Account balance after pull payment"
    );
    expect(
      autoPaymentBalanceBeforePull
        .add(LIMIT_AMOUNT)
        .eq(autoPaymentBalanceAfterPull),
      "Wrong Auto Payment balance after pull payment"
    );
  });

  it("should fail pull payment - wrong time", async () => {
    const { delegableAccount, autoPayment } = context;

    await expect(
      autoPayment.executePayment(delegableAccount.address, LIMIT_AMOUNT)
    ).to.be.rejected;
  });

  it("should remove payee/unsubscribe", async () => {
    const { delegableAccount, autoPayment } = context;
    await expect(delegableAccount.removeAllowedPayee(autoPayment.address)).to.be
      .fulfilled;

    const [accountAmountLimit, accountTimeLimit] =
      await delegableAccount.getPaymentConditions(autoPayment.address);

    const [autoPaymentAmountLimit, autoPaymentTimeLimit] =
      await autoPayment.getPaymentConditions(delegableAccount.address);

    expect(
      accountAmountLimit.eq(0),
      "Amount limit on the delegable account contract should match the intended amount limit"
    );
    expect(
      autoPaymentAmountLimit.eq(0),
      "Amount limit on the auto payment contract should match the intended amount limit"
    );

    expect(
      accountTimeLimit.eq(0),
      "Time Interval on the delegable account contract should match the intended time interval"
    );
    expect(
      autoPaymentTimeLimit.eq(0),
      "Time Interval on the auto payment contract should match the intended time interval"
    );
  });

  it("should add payee when auto payment is not compatible with IAutoPayment", async () => {
    const { delegableAccount, stubAutoPayment } = context;

    await expect(
      delegableAccount.addAllowedPayee(
        stubAutoPayment.address,
        LIMIT_AMOUNT,
        PAYMENT_PERIOD.MINUTE,
        GAS_LIMIT
      )
    ).to.be.fulfilled;

    const [accountAmountLimit, accountTimeLimit] =
      await delegableAccount.getPaymentConditions(stubAutoPayment.address);

    const [autoPaymentAmountLimit, autoPaymentTimeLimit] =
      await stubAutoPayment.getPaymentConditions(delegableAccount.address);

    console.log(accountAmountLimit.toString(), accountTimeLimit.toString());

    expect(
      accountAmountLimit.eq(LIMIT_AMOUNT),
      "Amount limit on the delegable account contract should match the intended amount limit"
    );

    expect(
      autoPaymentAmountLimit.eq(LIMIT_AMOUNT),
      "Amount limit on the auto payment contract should match the intended amount limit"
    );

    expect(
      accountTimeLimit.eq(0),
      "Time Interval on the delegable account contract should be 0"
    );
    expect(
      autoPaymentTimeLimit.eq(0),
      "Time Interval on the stub auto payment contract should should be 0"
    );
  });

  it("should perform pull payment when IAutoPayment is not supported", async () => {
    const { delegableAccount, stubAutoPayment, deployerWallet } = context;

    const accountBalanceBeforePull = await deployerWallet.provider.getBalance(
      delegableAccount.address
    );
    const autoPaymentBalanceBeforePull =
      await deployerWallet.provider.getBalance(stubAutoPayment.address);

    await expect(
      stubAutoPayment.executePayment(
        delegableAccount.address,
        LIMIT_AMOUNT,
        GAS_LIMIT
      )
    ).to.be.fulfilled;

    const accountBalanceAfterPull = await deployerWallet.provider.getBalance(
      delegableAccount.address
    );
    const autoPaymentBalanceAfterPull =
      await deployerWallet.provider.getBalance(stubAutoPayment.address);

    expect(
      accountBalanceAfterPull.add(LIMIT_AMOUNT).eq(accountBalanceBeforePull),
      "Wrong Delegable Account balance after pull payment"
    );
    expect(
      autoPaymentBalanceBeforePull
        .add(LIMIT_AMOUNT)
        .eq(autoPaymentBalanceAfterPull),
      "Wrong Auto Payment balance after pull payment"
    );
  });

  it("should remove payee/unsubscribe locally - payee contract not compatible IAutoPayment", async () => {
    const { delegableAccount, autoPayment } = context;
  });

  it("should not add a new subscriber - account contract not compatible IDelegateAccount", async () => {
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
