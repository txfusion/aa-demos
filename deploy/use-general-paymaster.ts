import * as hre from "hardhat";
import { getProvider, getWallet, readEnv } from "./utils";
import { ethers } from "ethers";
import { utils } from "zksync-web3";

// Address of the contract to interact with
const CONTRACT_ADDRESS = readEnv("GREETER_CONTRACT");
const PAYMASTER_ADDRESS = readEnv("GENERAL_PAYMASTER_CONTRACT");

// An example of a script to interact with the contract
export default async function () {
  console.log(`Running script to interact with contract ${CONTRACT_ADDRESS}`);

  // Load compiled contract info
  const contractArtifact = await hre.artifacts.readArtifact("Greeter");

  // Initialize contract instance for interaction
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    contractArtifact.abi,
    getWallet(), // Interact with the contract on behalf of this wallet
  );

  // Run contract read function
  const response = await contract.greet();
  console.log(`Current message is: ${response}`);

  let paymasterBalance = await getProvider().getBalance(PAYMASTER_ADDRESS);
  console.log(`Paymaster ETH balance is ${paymasterBalance.toString()}`);

  const gasPrice = await getProvider().getGasPrice();

  // Encoding the "ApprovalBased" paymaster flow's input
  const paymasterParams = utils.getPaymasterParams(PAYMASTER_ADDRESS, {
    type: "General",
    // empty bytes as testnet paymaster does not use innerInput
    innerInput: new Uint8Array(),
  });

  const newMessage = `Hello people! ${Date().toLocaleLowerCase()}`;

  // Estimate gas fee for mint transaction
  const gasLimit = await contract.estimateGas.setGreeting(newMessage);

  const fee = gasPrice.mul(gasLimit.toString());
  console.log("Transaction fee estimation is :>> ", fee.toString());

  const transaction = await contract.setGreeting(newMessage, {
    customData: {
      paymasterParams: paymasterParams,
      gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
    },
  });

  // Wait until transaction is processed
  await transaction.wait();

  // Read message after transaction
  console.log(`The message now is: ${await contract.greet()}`);

  paymasterBalance = await getProvider().getBalance(PAYMASTER_ADDRESS);

  console.log(`Paymaster ETH balance is now ${paymasterBalance.toString()}`);
}
