import * as hre from "hardhat";
import { getWallet, readEnv, getToken, getProvider, displayLoadingAnimation, greetingData } from "./utils";
import { ethers } from "ethers";
import { Interface } from "ethers/lib/utils";
import { utils } from "zksync-web3";

const CONTRACT_ADDRESS = readEnv("MULTICALL_3_CONTRACT");
const GREETER_CONTRACT = readEnv("GREETER_CONTRACT");
const PAYMASTER_ADDRESS = readEnv("APPROVAL_PAYMASTER_CONTRACT");
const token = getToken();
const provider = getProvider();

export default async function () {
  const loadingAnimation = displayLoadingAnimation();
  console.log(`Running script to interact with contract ${CONTRACT_ADDRESS}`);
  console.log(
    `Paymaster ERC20 token balance is before execution: ${await token.balanceOf(
      PAYMASTER_ADDRESS,
    )}`,
  );
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

  
  const updateGreeterInterface = new Interface([
    "function setGreeting(string memory _lang, string memory _greeting)",
  ]);
  //  array of function calls
  const functionCalls: any[] = [];

  // batch call the function on multiple addresses and push to the array
  function greetings(greetings) {
    greetings.forEach((greet) => {
      const callData = updateGreeterInterface.encodeFunctionData( "setGreeting",
        [`${greet.language}`, ` is  ${greet.text} TxCitizens!`],
      );
      functionCalls.push({
        target: GREETER_CONTRACT,
        allowFailure: true,
        callData: callData,
      });
    });
  }
  greetings(greetingData());

  

  // Encoding the "ApprovalBased" paymaster flow's input
  const paymasterParams = utils.getPaymasterParams(PAYMASTER_ADDRESS, {
    type: "ApprovalBased",
    token: token.address,
    // set minimalAllowance as we defined in the paymaster contract
    minimalAllowance: ethers.BigNumber.from(1),
    // empty bytes as testnet paymaster does not use innerInput
    innerInput: new Uint8Array(),
  });

  // Transaction Gas Estimate
  const gasPrice = await getProvider().getGasPrice();
  const gasLimit = await contract.estimateGas.aggregate3(functionCalls);

  const fee = gasPrice.mul(gasLimit.toString());
  console.log("Transaction fee estimation is :>> ", fee.toString());

  const customData = {
    paymasterParams: paymasterParams,
    gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
  };
  const res = await contract
    .aggregate3(functionCalls, {
      customData: customData,
    })
    .then((res) => res.wait());
  console.log({ res });

  // Run contract read function
  const response = await greeter.greet("Arabic");
  console.log(`Current message is: ${response}`);
  for (const language of greetingData()) {
    const greeting = await greeter.greet(language.language);
    console.log(`The greeting in $ ${greeting}`);
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
