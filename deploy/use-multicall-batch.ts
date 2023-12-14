import * as hre from "hardhat";
import { getWallet, readEnv,getToken, getProvider} from "./utils";
import { ethers } from "ethers";
import { Interface } from "ethers/lib/utils";
import { utils } from "zksync-web3";

const CONTRACT_ADDRESS = readEnv("MULTICALL_3_CONTRACT");
const GREETER_CONTRACT = readEnv("GREETER_CONTRACT");
const PAYMASTER_ADDRESS = readEnv("APPROVAL_PAYMASTER_CONTRACT");
const token = getToken()
const provider = getProvider();

export default async function () {
  console.log(`Running script to interact with contract ${CONTRACT_ADDRESS}`);

  // Load compiled contract info
  const contractArtifact = await hre.artifacts.readArtifact("Multicall3");
  const greeterArtifact = await hre.artifacts.readArtifact("Greeter");
  const greeter = new ethers.Contract(
    GREETER_CONTRACT,
    greeterArtifact.abi,
    getWallet(),
  );

  let paymasterBalance = await provider.getBalance(PAYMASTER_ADDRESS);
  console.log(`Paymaster ETH balance is before payment:   ${paymasterBalance.toString()}`);

 
  console.log(
            `Paymaster ERC20 token balance is before execution: ${await token.balanceOf(
      PAYMASTER_ADDRESS,
    )}`,
  );
  const updateGreeterInterface = new Interface([
    "function setGreeting(string memory _greeting) public",
  ]);

  // Fake data to pass into setGreeting function
  const greetingData = [
    { text: "Hello", language: "English" },
    { text: "Bonjour", language: "French" },
    { text: "Hola", language: "Spanish" },
    { text: "Ciao", language: "Italian" },
    { text: "Konnichiwa", language: "Japanese" },
    { text: "Namaste", language: "Hindi" },
    { text: "Merhaba", language: "Turkish" },
    { text: "Guten Tag", language: "German" },
    { text: "Olá", language: "Portuguese" },
    { text: "Salam", language: "Arabic" },
    { text: "Salut", language: "Romanian" },
    { text: "Aloha", language: "Hawaiian" },
    { text: "Hej", language: "Swedish" },
    { text: "Shalom", language: "Hebrew" },
    { text: "Annyeonghaseyo", language: "Korean" },
    { text: "Sawubona", language: "Zulu" },
    { text: "Jambo", language: "Swahili" },
    { text: "Szia", language: "Hungarian" },
    { text: "Nǐ hǎo", language: "Chinese" },
    { text: "Ahoj", language: "Czech" }
  ];
  

  //  array of function calls
  const functionCalls:any[] = [];

  // batch call the function on multiple addresses and push to the array
  function greetings(greetings) {
    greetings.forEach((greet) => {
      const callData = updateGreeterInterface.encodeFunctionData(
        // This is how to say Hello TxCitizens in different languages
        "setGreeting",[`${greet.text} "TxCitizens!"  ${greet.language}`])
      // console.log(`${greet.text} "TxCitizens!"  ${greet.language}`);

      functionCalls.push({
        target: GREETER_CONTRACT,
        allowFailure: true,
        callData: callData,
      })
    });
  }
greetings(greetingData)

  // Initialize contract instance for interaction
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    contractArtifact.abi,
    getWallet(),
  );

 // Encoding the "ApprovalBased" paymaster flow's input
  const paymasterParams = utils.getPaymasterParams(PAYMASTER_ADDRESS, {
    type: "ApprovalBased",
    token: token.address,
    // set minimalAllowance as we defined in the paymaster contract
    minimalAllowance: ethers.BigNumber.from(1),
    // empty bytes as testnet paymaster does not use innerInput
    innerInput: new Uint8Array(),
  });
   
const customData = {
  paymasterParams: paymasterParams,
  gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
}
  const res = await contract
    .aggregate3(
      functionCalls,  {
        customData: customData}
    )
    .then((res) => res.wait());
  // console.log({ res });
  // Run contract read function
  const response = await greeter.greet();
  console.log(`Current message is: ${response}`);
 

  const gasPrice = await getProvider().getGasPrice();
  const gasLimit = await contract.estimateGas.aggregate3(functionCalls);

  const fee = gasPrice.mul(gasLimit.toString());
  console.log("Transaction fee estimation is :>> ", fee.toString());

  console.log(
    `Paymaster ERC20 token balance is now ${await token.balanceOf(
      PAYMASTER_ADDRESS,
    )}`,
  );
   paymasterBalance = await provider.getBalance(PAYMASTER_ADDRESS);
  console.log(`Paymaster ETH balance  is now ${paymasterBalance.toString()}`);


}