import * as hre from "hardhat";
import {
  getWallet,
  readEnv,
  LOCAL_RICH_WALLETS,
  getProvider,
  displayLoadingAnimation,
} from "./utils";
import { ethers } from "ethers";

const CONTRACT_ADDRESS = readEnv("MULTICALL_3_CONTRACT");
const ERC20_TOKEN_CONTRACT = readEnv("ERC20_TOKEN_CONTRACT");

export default async function () {
  console.log(`Running script to interact with contract ${CONTRACT_ADDRESS}`);
  const loadingAnimation = displayLoadingAnimation();
  // Load compiled contract info
  const contractArtifact = await hre.artifacts.readArtifact("Multicall3");
  // Initialize contract instance for interaction
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    contractArtifact.abi,
    getWallet(),
  );
  const erc20Artifact = await hre.artifacts.readArtifact("ERC20Token");
  const erc20 = new ethers.Contract(
    ERC20_TOKEN_CONTRACT,
    erc20Artifact.abi,
    getWallet(),
  );
  const bal = await erc20.balanceOf(getWallet().address);
  console.log("Caller ERC20 balance", bal.toString());
  // approve Multicall contract to spend Token
  await erc20
    .connect(getWallet())
    .functions.approve(CONTRACT_ADDRESS, 100)
    .then((res) => res.wait());

  // batch call the function on multiple addresses and push to the array
  const functionCalls = LOCAL_RICH_WALLETS.map((wallet, index) => {
    const callData = erc20.interface.encodeFunctionData("transferFrom", [
      getWallet().address,
      wallet.address,
      1,
    ]);
    console.log(`Address ${index + 1}: "${wallet.address}"`);

    return {
      target: ERC20_TOKEN_CONTRACT,
      allowFailure: false,
      callData: callData,
    };
  });

  const gasPrice = await getProvider().getGasPrice();
  const gasLimit = await contract.estimateGas.aggregate3(functionCalls);

  const fee = gasPrice.mul(gasLimit.toString());
  console.log(`Transaction fee estimation is :>> ${fee.toString()}\n`);

  const res = await contract
    .aggregate3(functionCalls, {
      gasLimit: 1_000_000,
    })
    .then((res) => res.wait());
  // console.log({ res });
  // Run contract read function
  for (let i = 0; i < LOCAL_RICH_WALLETS.length; i++) {
    const wallet = LOCAL_RICH_WALLETS[i];
    const balance = await erc20.balanceOf(wallet.address);
    console.log(`Balance of Address ${i + 1}: ${wallet.address} is ${balance.toString()}`);
  }
  

  clearInterval(loadingAnimation);
  console.log("\nExecution complete!");
}
