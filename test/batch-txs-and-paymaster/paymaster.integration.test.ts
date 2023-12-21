import hre from "hardhat";
import { expect, assert } from "chai";
import { describe } from "mocha";
import { Wallet, Provider, ContractFactory, utils } from "zksync-web3";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";
import { ethers } from "ethers";
import {
  LOCAL_RICH_WALLETS,
  deployContract,
  getProvider,
  getWallet,
  greetingData,
} from "../../deploy/utils";

const TESTNET_PROVIDER_URL = "http://localhost:3050";
const TRANSFER_AMOUNT = ethers.utils.parseEther("5"); // Amount of ETH to fund paymaster
const TOKEN_AMOUNT_TO_MINT = 1000;

describe("Paymaster integration test", async () => {
  async function setup() {
    const provider = new Provider(TESTNET_PROVIDER_URL);

    const deployerWallet = new Wallet(
      LOCAL_RICH_WALLETS[0].privateKey,
      provider,
    );
    const receiver = new Wallet(LOCAL_RICH_WALLETS[1].privateKey, provider);
    const receiverWallet = receiver.address;
    const deployer = new Deployer(hre, deployerWallet);

    /**
     * Deployment of RC20, Greeter, Multicall and Paymaster contracts
     */

    const deployedErc20Contract = await deployContract("ERC20Token", [
      "TOKEN",
      "TOKEN",
      18,
    ]);
    const deployedGreeterContract = await deployContract("Greeter", [
      "ENG",
      "Hi there!",
    ]);
    const deployedMulticallContract = await deployContract("Multicall3", []);
    const deployedGeneralPaymaster = await deployContract(
      "GeneralPaymaster",
      [],
    );
    const paymasterContract = await deployContract("ApprovalPaymaster", [
      deployedErc20Contract.address,
    ]);
    const genPaymasterAddr = deployedGeneralPaymaster.address;
    const paymasterAddress = paymasterContract.address;

    /**
     * Funding paymaster with ETH
     */

    await deployer.zkWallet
      .sendTransaction({
        to: paymasterAddress,
        value: TRANSFER_AMOUNT,
      })
      .then((res) => res.wait());

    await deployer.zkWallet
      .sendTransaction({
        to: genPaymasterAddr,
        value: TRANSFER_AMOUNT,
      })
      .then((res) => res.wait());

    return {
      deployerWallet,
      deployedErc20Contract,
      deployedGeneralPaymaster,
      erc20ContractAddress: deployedErc20Contract.address,
      paymasterContract,
      deployedMulticallContract,
      deployedGreeterContract,
      greeterAddress: deployedGreeterContract.address,
      deployerAddress: deployerWallet.address,
      paymasterAddress,
      genPaymasterAddr,
      receiverWallet,
    };
  }

  let context: Awaited<ReturnType<typeof setup>>;

  before("Setting up the context", async () => {
    context = await setup();
  });

  it("should mint ERC20 token to wallet () :: ", async () => {
    const { deployerAddress, deployedErc20Contract } = context;

    
      await deployedErc20Contract.mint(deployerAddress, TOKEN_AMOUNT_TO_MINT).then((res) => res.wait())
    const balance = await deployedErc20Contract.balanceOf(deployerAddress);
    console.log("minted token ==================", Number(balance));

    expect(Number(balance)).to.be.equal(TOKEN_AMOUNT_TO_MINT);
  });
  it("should return the new greeting once it's changed", async function () {
    const { deployedGreeterContract } = context;

    const greeting = "Bonjour TxCitizen!";
    const lang = "French";

    // Set the greeting
    await deployedGreeterContract.setGreeting(lang, greeting).then((res) => res.wait())

    // Get the returned value from the greet function
    const returnedValue = await deployedGreeterContract.greet("French");

    // Assert the values separately to ensure correctness
    expect(returnedValue[0]).to.equal(lang); // Check language
    expect(returnedValue[1]).to.equal(greeting); // Check greeting message
  });
  it("should use paymaster to pay for gas for ERC20 transfer", async function () {
    const {
      paymasterContract,
      paymasterAddress,
      deployedErc20Contract,
      deployerAddress,
      receiverWallet,
      erc20ContractAddress,
    } = context;

    const paymasterBalance = await getProvider().getBalance(
      paymasterContract.address,
    );

    console.log(`Paymaster ETH balance is ${paymasterBalance.toString()}`);

    // Encoding the "ApprovalBased" paymaster flow's input
    const paymasterParams = utils.getPaymasterParams(paymasterAddress, {
      type: "ApprovalBased",
      token: erc20ContractAddress,
      // set minimalAllowance as we defined in the paymaster contract
      minimalAllowance: ethers.BigNumber.from(1),
      // empty bytes as testnet paymaster does not use innerInput
      innerInput: new Uint8Array(),
    });
    const customData = {
      paymasterParams: paymasterParams,
      gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
    };

    // Mint token 1000 to the deployer address
    
      await deployedErc20Contract.mint(deployerAddress, TOKEN_AMOUNT_TO_MINT, {
        // paymaster info
        customData: customData,
      }).then((res) => res.wait())

    const TOKEN_AMOUNT_TO_TRANSFER = 100;

    // transfer 100 tokens from the deployer to the receiver wallet

    await deployedErc20Contract
      .transfer(receiverWallet, TOKEN_AMOUNT_TO_TRANSFER, {
        customData: customData,
      })
      .then((res) => res.wait());

    const deployerBalance =
      await deployedErc20Contract.balanceOf(deployerAddress);
    console.log(" deployerBalance ==================", Number(deployerBalance));

    const receiverBalance =
      await deployedErc20Contract.balanceOf(receiverWallet);
    const newPaymasterBalance =
      await deployedErc20Contract.balanceOf(paymasterAddress);
    console.log("=========receiverBalance==========", Number(receiverBalance));
    console.log(
      "========PaymasterBalance==========",
      Number(newPaymasterBalance),
    );
    const paymasterETHBalance = await getProvider().getBalance(
      paymasterContract.address,
    );
    console.log(
      "=========PaymasterETHBalance==========",
      paymasterETHBalance.toString(),
    );

    expect(Number(receiverBalance)).to.equal(Number(TOKEN_AMOUNT_TO_TRANSFER));
    expect(Number(newPaymasterBalance)).to.equal(Number(2));
  });

  it("should use paymaster to pay for gas for Multicall Batch transaction", async function () {
    const {
      paymasterContract,
      paymasterAddress,
      deployedMulticallContract,
      deployedErc20Contract,
      deployerWallet,
      erc20ContractAddress,
    } = context;
    const paymasterBalance = await getProvider().getBalance(
      paymasterContract.address,
    );

    console.log(`Paymaster ETH balance is ${paymasterBalance.toString()}`);

    // Encoding the "ApprovalBased" paymaster flow's input
    const paymasterParams = utils.getPaymasterParams(paymasterAddress, {
      type: "ApprovalBased",
      token: erc20ContractAddress,
      minimalAllowance: ethers.BigNumber.from(1),
      innerInput: new Uint8Array(),
    });
    const customData = {
      paymasterParams: paymasterParams,
      gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
    };

    const TOKEN_AMOUNT_TO_TRANSFER = 100;
    const TOKEN_AMOUNT_OF_TRANSFERFROM = 1;
    // approve Multicall contract to spend 100 Token
    await deployedErc20Contract
      .connect(deployerWallet)
      .functions.approve(
        deployedMulticallContract.address,
        TOKEN_AMOUNT_TO_TRANSFER,
        {
          customData: customData,
        },
      )
      .then((res) => res.wait());

    // transfer 100 tokens from the deployer to the receiver wallet
    const functionCalls = LOCAL_RICH_WALLETS.map((wallet, index) => {
      const callData = deployedErc20Contract.interface.encodeFunctionData(
        "transferFrom",
        [getWallet().address, wallet.address, TOKEN_AMOUNT_OF_TRANSFERFROM],
      );
      return {
        target: erc20ContractAddress,
        allowFailure: false,
        callData: callData,
      };
    });
    const result = await deployedMulticallContract.aggregate3(functionCalls, {
      customData: customData,
    });

    const receipt = await result.wait();

    /**
     * check the status of each transaction in the multicall using
     *  getTransactionReceipt function
     **/
    const TransactionReciept = receipt.events.map((event) =>
      event.getTransactionReceipt(),
    );
    const conformedTransaction = await Promise.all(TransactionReciept);
    conformedTransaction.forEach((data) => {
      console.log("transaction status: ", data.status);
      // assert that the status is 1 i.e success
      assert(data.status === 1);
    });
    // check one of the wallets balance
    const balOfAddressFour = await deployedErc20Contract.balanceOf(
      LOCAL_RICH_WALLETS[4].address,
    );
    const balOfPaymaster =
      await deployedErc20Contract.balanceOf(paymasterAddress);
    console.log(
      "\n =========PaymasterBalance==========",
      Number(balOfPaymaster),
    );

    // assertions
    assert(balOfAddressFour.eq(TOKEN_AMOUNT_OF_TRANSFERFROM));
    assert(balOfPaymaster.eq(4));
  });
  it("should use geenral paymaster to pay for gas for Multicall transaction:: Sponsored Payment", async function () {
    const {
      genPaymasterAddr,
      deployedMulticallContract,
      deployedGreeterContract,
      greeterAddress,
    } = context;
    const paymasterBalance = await getProvider().getBalance(genPaymasterAddr);
    console.log(
      `GeneralPaymaster ETH balance is ${paymasterBalance.toString()}`,
    );

    //  array of function calls
    const functionCalls = greetingData.map((data) => ({
      target: greeterAddress,
      allowFailure: true,
      callData: deployedGreeterContract.interface.encodeFunctionData(
        "setGreeting",
        [`${data.language}`, ` is  ${data.text} TxCitizens!`],
      ),
    }));
    const paymasterParams = utils.getPaymasterParams(genPaymasterAddr, {
      type: "General",
      // empty bytes as testnet paymaster does not use innerInput
      innerInput: new Uint8Array(),
    });

    const res = await deployedMulticallContract.aggregate3(functionCalls, {
      customData: {
        paymasterParams,
        gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
      },
    });
    const receipt = await res.wait();
    /**
     * check the status of each transaction in the multicall using
     *  getTransactionReceipt function
     **/
    const TransactionReciept = receipt.events.map((event) =>
      event.getTransactionReceipt(),
    );
    const conformedTransaction = await Promise.all(TransactionReciept);
    conformedTransaction.forEach((data) => {
      console.log(
        "transaction status and confirmations of sponsored payment of each transaction: ",
        data.status,data.confirmations
      );
      // assert that the status is 1 i.e success
      assert(data.status === 1);
      assert(data.confirmations >= 1);
    });
    const presentPaymasterBalance =
      await getProvider().getBalance(genPaymasterAddr);
    // Run contract read function
    for (const data of greetingData) {
      const greeting = await deployedGreeterContract.greet(data.language);
      expect(greeting[1]).to.equal(` is  ${data.text} TxCitizens!`);
    }
    console.log(
      `GeneralPaymaster ETH balance is ${presentPaymasterBalance.toString()}`,
    );
  });
});
