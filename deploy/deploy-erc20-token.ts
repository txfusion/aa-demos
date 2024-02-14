import { deployContract } from "./utils";

export default async function () {
  const contractArtifactName = "ERC20Token";
  const constructorArguments = ["TOKEN", "TOKEN", 18];
  await deployContract(contractArtifactName, constructorArguments);
}
