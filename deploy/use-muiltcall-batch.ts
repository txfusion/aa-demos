import * as hre from "hardhat";
import { getWallet, readEnv , LOCAL_RICH_WALLETS, getProvider} from "./utils";
import { ethers } from "ethers";
import { Interface } from "ethers/lib/utils";

const CONTRACT_ADDRESS = readEnv("MULTICALL_3_CONTRACT");
const GREETER_CONTRACT = readEnv("GREETER_CONTRACT");
const ERC20_TOKEN_CONTRACT = readEnv("ERC20_TOKEN_CONTRACT");

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
  const erc20Artifact = await hre.artifacts.readArtifact("ERC20Token");
  const erc20 = new ethers.Contract(
    ERC20_TOKEN_CONTRACT,
    erc20Artifact.abi,
    getWallet(),
  );

  const updateGreeterInterface = new Interface([
    "function setGreeting(string memory _greeting) public",
  ]);

  const updateErc20Interface = new Interface([
    "function mint(address _to, uint256 _amount) public",
  ]);

  //  array of function calls
  const functionCalls:any[] = [];

  // batch call the function on multiple addresses and push to the array
  function addresses(wallets) {
    wallets.forEach((wallet, index) => {
      const callData = updateErc20Interface.encodeFunctionData(
        "mint",[wallet.address, index + 1])
      console.log(`Address ${index + 1}: "${wallet.address}"`);
      
      functionCalls.push({
        target: ERC20_TOKEN_CONTRACT,
        allowFailure: true,
        callData: callData,
      })
    });
  }



  addresses(LOCAL_RICH_WALLETS);

  // Initialize contract instance for interaction
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    contractArtifact.abi,
    getWallet(),
  );

    const greeterCallData = [
        {
          target: GREETER_CONTRACT,
          allowFailure: true,
          callData: updateGreeterInterface.encodeFunctionData("setGreeting", [
            "Hi, welcome to TxFusion!",
          ]),
        },
      ]
      functionCalls.push(...greeterCallData)

  const res = await contract
    .aggregate3(
      functionCalls
    )
    .then((res) => res.wait());
  console.log({ res });
  // Run contract read function
  const response = await greeter.greet();
  console.log(`Current message is: ${response}`);
  for (const wallet of LOCAL_RICH_WALLETS) {
    const balance = await erc20.balanceOf(wallet.address);
    console.log(`Balance of ${wallet.address} is ${balance.toString()}`);
  }

  const gasPrice = await getProvider().getGasPrice();
  const gasLimit = await contract.estimateGas.aggregate3(functionCalls);

  const fee = gasPrice.mul(gasLimit.toString());
  console.log("Transaction fee estimation is :>> ", fee.toString());
}

