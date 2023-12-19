import hre from "hardhat";
import { expect, assert } from "chai";
import { describe } from "mocha";
import { Wallet, Provider } from "zksync-web3";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { ethers } from "ethers";

import { richWallet, PAYMENT_INTERVALS, deployContract } from "../../utils";

import {
  DelegableAccount__factory,
  AutoPayment__factory,
  DelegableAccountStub__factory,
} from "../../typechain";

const TESTNET_PROVIDER_URL = "http://localhost:8011";

const TRANSFER_AMOUNT = ethers.utils.parseEther("5"); // Amount of ETH to fund DelegableAccount
const LIMIT_AMOUNT = ethers.utils.parseEther("1"); // Limit of a single Pull Payment

const GAS_LIMIT = { gasLimit: 10_000_000 };
const PAYMENT_INTERVAL = PAYMENT_INTERVALS.MINUTE;

describe("Payments integration test", async () => {
  async function setup() {
    const provider = new Provider(TESTNET_PROVIDER_URL);

    const deployerWallet = new Wallet(richWallet[0].privateKey, provider);
    const stranger = new Wallet(richWallet[1].privateKey, provider);

    const deployer = new Deployer(hre, deployerWallet);

    /**
     * Deployment
     */

    const delegableAccountContract = await deployContract(
      deployer,
      "DelegableAccount",
      [deployer.zkWallet.address]
    );
    const delegableAccountStubContract = await deployContract(
      deployer,
      "DelegableAccountStub",
      [deployer.zkWallet.address]
    );

    const autoPaymentContract = await deployContract(
      deployer,
      "AutoPayment",
      []
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
      delegableAccountStub: new DelegableAccountStub__factory(
        deployer.zkWallet
      ).attach(delegableAccountStubContract.address),
      autoPayment: new AutoPayment__factory(deployer.zkWallet).attach(
        autoPaymentContract.address
      ),
      provider: deployerWallet.provider,
      deployerWallet,
      stranger,
    };
  }

  let context: Awaited<ReturnType<typeof setup>>;

  before("Setting up the context", async () => {
    context = await setup();
  });

  it("addAllowedPayee() :: add payee & subscribe", async () => {
    const { delegableAccount, autoPayment } = context;

    /**
     * addAllowedPayee
     */

    await expect(
      delegableAccount.addAllowedPayee(
        autoPayment.address,
        LIMIT_AMOUNT,
        PAYMENT_INTERVAL.id,
        GAS_LIMIT
      )
    ).to.be.fulfilled;

    /**
     * Payment conditions
     */

    const [accountAmountLimit, accountTimeLimit] =
      await delegableAccount.getPaymentConditions(autoPayment.address);

    const [autoPaymentAmountLimit, autoPaymentTimeLimit] =
      await autoPayment.getPaymentConditions(delegableAccount.address);

    /**
     * Assertion
     */

    assert.equal(
      accountAmountLimit.toString(),
      LIMIT_AMOUNT.toString(),
      "The limit amount on the DelegableAccount contract does not match LIMIT_AMOUNT"
    );
    assert.equal(
      autoPaymentAmountLimit.toString(),
      LIMIT_AMOUNT.toString(),
      "The limit amount on the DelegableAccount contract does not match LIMIT_AMOUNT"
    );

    assert.equal(
      +accountTimeLimit.toString(),
      PAYMENT_INTERVAL.value,
      "Payment interval on the DelegableAccount contract does not match PAYMENT_INTERVAL"
    );
    assert.equal(
      +autoPaymentTimeLimit.toString(),
      PAYMENT_INTERVAL.value,
      "Payment interval on the AutoPayment contract does not match PAYMENT_INTERVAL"
    );
  });

  it("executePayment() :: working", async () => {
    const { delegableAccount, autoPayment, provider } = context;

    /**
     * Balance of contracts before making f-call
     */

    const accountBalanceBeforePull = await provider.getBalance(
      delegableAccount.address
    );
    const autoPaymentBalanceBeforePull = await provider.getBalance(
      autoPayment.address
    );

    /**
     * executePayment
     */

    await expect(
      autoPayment.executePayment(delegableAccount.address, LIMIT_AMOUNT)
    ).to.be.fulfilled;

    /**
     * Balance of contracts after making f-call
     */

    const accountBalanceAfterPull = await provider.getBalance(
      delegableAccount.address
    );
    const autoPaymentBalanceAfterPull = await provider.getBalance(
      autoPayment.address
    );

    /**
     * Assertion
     */

    assert.equal(
      accountBalanceAfterPull.add(LIMIT_AMOUNT).toString(),
      accountBalanceBeforePull.toString(),
      "DelegableAccount balance does not match the expected balance AFTER pull payment"
    );
    assert.equal(
      autoPaymentBalanceBeforePull.add(LIMIT_AMOUNT).toString(),
      autoPaymentBalanceAfterPull.toString(),
      "AutoPayment balance does not match the expected balance AFTER pull payment"
    );
  });

  it("executePayment() :: fails - wrong time", async () => {
    const { delegableAccount, autoPayment } = context;
    /**
     * executePayment
     */

    await expect(
      autoPayment.executePayment(delegableAccount.address, LIMIT_AMOUNT)
    ).to.be.reverted;
  });

  it("removeAllowedPayee() :: remove payee & unsubscribe", async () => {
    const { delegableAccount, autoPayment } = context;

    /**
     * removeAllowedPayee
     */

    await expect(delegableAccount.removeAllowedPayee(autoPayment.address)).to.be
      .fulfilled;

    /**
     * Payment conditions
     */

    const [accountAmountLimit, accountTimeLimit] =
      await delegableAccount.getPaymentConditions(autoPayment.address);

    const [autoPaymentAmountLimit, autoPaymentTimeLimit] =
      await autoPayment.getPaymentConditions(delegableAccount.address);

    /**
     * Assertion
     */
    assert.equal(
      +accountAmountLimit.toString(),
      0,
      "DelegableAccount :: getPaymentConditions :: wrong limit amount "
    );
    assert.equal(
      +autoPaymentAmountLimit.toString(),
      0,
      "The limit amount on the DelegableAccount contract does not match 0"
    );

    assert.equal(
      +accountTimeLimit.toString(),
      0,
      "Payment interval on the DelegableAccount contract does not match 0"
    );
    assert.equal(
      +autoPaymentTimeLimit.toString(),
      0,
      "Payment interval on the AutoPayment contract does not match 0"
    );
  });

  it("addAllowedPayee() :: incompatible DelegableAccount", async () => {
    const { delegableAccountStub, autoPayment } = context;

    /**
     * addAllowedPayee
     */

    await expect(
      delegableAccountStub.addAllowedPayee(
        autoPayment.address,
        LIMIT_AMOUNT,
        PAYMENT_INTERVAL.id,
        GAS_LIMIT
      )
    ).to.be.reverted;

    /**
     * Payment conditions
     */

    const [accountAmountLimit, accountTimeLimit] =
      await delegableAccountStub.getPaymentConditions(autoPayment.address);

    const [autoPaymentAmountLimit, autoPaymentTimeLimit] =
      await autoPayment.getPaymentConditions(delegableAccountStub.address);

    /**
     * Assertion
     */

    assert.equal(
      accountAmountLimit.toString(),
      "0",
      "The limit amount on the DelegableAccount contract does not match 0"
    );
    assert.equal(
      autoPaymentAmountLimit.toString(),
      "0",
      "The limit amount on the DelegableAccount contract does not match 0"
    );

    assert.equal(
      +accountTimeLimit.toString(),
      0,
      "Payment interval on the DelegableAccount contract does not match 0"
    );
    assert.equal(
      +autoPaymentTimeLimit.toString(),
      0,
      "Payment interval on the AutoPayment contract does not match 0"
    );
  });

  it("withdraw() :: working - send ETH to owner", async () => {
    const { autoPayment, deployerWallet, provider } = context;

    /**
     * Balance of contracts before making f-call
     */

    const ownerBalanceBeforeWithdrawal = await provider.getBalance(
      deployerWallet.address
    );
    const autoPaymentBalanceBeforeWithdrawal = await provider.getBalance(
      autoPayment.address
    );

    /**
     * Withdraw ETH to owner
     */

    const tx = await expect(autoPayment.withdraw()).to.be.fulfilled;
    const receipt = await tx.wait();

    const gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice);

    /**
     * Balance of contracts after making f-call
     */

    const ownerBalanceAfterWithdrawal = await provider.getBalance(
      deployerWallet.address
    );
    const autoPaymentBalanceAfterWithdrawal = await provider.getBalance(
      autoPayment.address
    );

    /**
     * Assertion
     */

    assert.equal(
      ownerBalanceBeforeWithdrawal
        .add(autoPaymentBalanceBeforeWithdrawal)
        .sub(gasCost)
        .toString(),
      ownerBalanceAfterWithdrawal.toString(),
      "Owner balance does not match the expected balance AFTER Withdrawal"
    );
    assert.equal(
      +autoPaymentBalanceAfterWithdrawal.toString(),
      0,
      "AutoPayment balance does not match the expected balance AFTER Withdrawal"
    );
  });
});
