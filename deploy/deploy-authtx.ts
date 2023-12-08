import * as hre from "hardhat";
import { BigNumber } from "ethers";
import { deployContract } from "./utils";

export default async function () {
  const contractArtifactName = "TokenAuthorisable";

  const AUTH_TOKEN_SETTINGS = {
    name: "Authorisable EIP-3009 Token",
    version: "1",
    symbol: "authEIP3009",
    decimals: 18,
    supply: BigNumber.from("100000000000000"), // 100_000_000_000_000
  };

  const constructorArguments = [
    AUTH_TOKEN_SETTINGS.name,
    AUTH_TOKEN_SETTINGS.version,
    AUTH_TOKEN_SETTINGS.symbol,
    AUTH_TOKEN_SETTINGS.decimals,
    AUTH_TOKEN_SETTINGS.supply,
  ];

  console.log(
    `Deploying the TokenAuthorisable contract on "${hre.network.name}" network...`,
  );

  await deployContract(contractArtifactName, constructorArguments, {
    noVerify: true,
  });
}
