import * as hre from "hardhat";
import { getWallet, readEnv } from "./utils";
import { ethers } from "ethers";
import { Interface } from "ethers/lib/utils";

const CONTRACT_ADDRESS = readEnv("MULTICALL_3_CONTRACT");
const GREETER_CONTRACT = readEnv("GREETER_CONTRACT");

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

  const updateGreeterInterface = new Interface([
    "function setGreeting(string memory _greeting) public",
  ]);

  // Initialize contract instance for interaction
  const contract = new ethers.Contract(
    CONTRACT_ADDRESS,
    contractArtifact.abi,
    getWallet(),
  );

  const res = await contract
    .aggregate3([
      {
        target: GREETER_CONTRACT,
        allowFailure: true,
        callData: updateGreeterInterface.encodeFunctionData("setGreeting", [
          "New one!",
        ]),
      },
    ])
    .then((res) => res.wait());
  console.log({ res });
  // Run contract read function
  const response = await greeter.greet();
  console.log(`Current message is: ${response}`);
}
