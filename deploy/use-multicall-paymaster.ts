import * as hre from "hardhat";
import {
  getWallet,
  readEnv,
  getToken,
  getProvider,
  displayLoadingAnimation,
  greetingData,
} from "./utils";
import { ethers } from "ethers";
import { utils } from "zksync-web3";

const CONTRACT_ADDRESS = readEnv("MULTICALL_3_CONTRACT");
const GREETER_CONTRACT = readEnv("GREETER_CONTRACT");
const PAYMASTER_ADDRESS = readEnv("APPROVAL_PAYMASTER_CONTRACT");
const token = getToken();
const provider = getProvider();

export default async function () {
  const loadingAnimation = displayLoadingAnimation();
  console.log(`Running script to interact with contract ${CONTRACT_ADDRESS}`);


  // Load compiled contract info
  const contractArtifact = await hre.artifacts.readArtifact("Multicall3");
  const greeterArtifact = await hre.artifacts.readArtifact("Greeter");
  const greeter = new ethers.Contract(
    GREETER_CONTRACT,
    greeterArtifact.abi,
    getWallet(),
  );
  // Initialize contract instance for interaction
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    contractArtifact.abi,
    getWallet(),
  );

  let paymasterBalance = await provider.getBalance(PAYMASTER_ADDRESS);
  console.log(
    `Paymaster ETH balance is before payment:   ${paymasterBalance.toString()}`,
  );

  //  array of function calls
  const functionCalls = greetingData.map((data) => ({
    target: GREETER_CONTRACT,
    allowFailure: true,
    callData: greeter.interface.encodeFunctionData("setGreeting", [
      `${data.language}`,
      ` is  ${data.text} TxCitizens!`,
    ]),
  }));
  // Encoding the "ApprovalBased" paymaster flow's input
  const paymasterParams = utils.getPaymasterParams(PAYMASTER_ADDRESS, {
    type: "ApprovalBased",
    token: token.address,
    minimalAllowance: ethers.BigNumber.from(1),
    innerInput: new Uint8Array(),
  });

  // Transaction Gas Estimate
  const gasPrice = await getProvider().getGasPrice();
  const gasLimit = await contract.estimateGas.aggregate3(functionCalls);
  const fee = gasPrice.mul(gasLimit.toString());
  console.log("Transaction fee estimation is :>> ", fee.toString());

  const res = await contract.aggregate3(functionCalls, {
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
    console.log("\n transaction status: ", data.status);
  });
  // Run contract read function
  for (const data of greetingData) {
    const greeting = await greeter.greet(data.language);
    console.log(`The greeting in ${data.language}: ${greeting}`);
  }

  console.log(
    `\nPaymaster ERC20 token balance is now ${await token.balanceOf(
      PAYMASTER_ADDRESS,
    )}`,
  );

  paymasterBalance = await provider.getBalance(PAYMASTER_ADDRESS);
  console.log(
    `Paymaster ETH balance  is after execution ${paymasterBalance.toString()}`,
  );
  clearInterval(loadingAnimation);
  console.log("\nExecution complete!");
}
