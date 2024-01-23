import hre from "hardhat";
import { Provider, Wallet } from "zksync-web3";
import { Deployer } from "@matterlabs/hardhat-zksync-deploy";

import { LOCAL_RICH_WALLETS } from "../../deploy/utils";
import { PROVIDER_URL } from "./constants";
import { BigNumber, Contract } from "ethers";

export async function transactionAuthorizationSetup() {
  const AUTH_TOKEN_SETTINGS = {
    supply: BigNumber.from("100000000000000"), // 100_000_000_000_000
    name: "Authorisable EIP-3009 Token",
    version: "1",
    symbol: "authEIP3009",
    decimals: 18,
  };

  const provider = new Provider(PROVIDER_URL);

  const deployerWallet = new Wallet(LOCAL_RICH_WALLETS[0].privateKey, provider);
  const receiver = new Wallet(LOCAL_RICH_WALLETS[1].privateKey, provider);
  const randomWallet = new Wallet(LOCAL_RICH_WALLETS[2].privateKey, provider);

  const deployer = new Deployer(hre, deployerWallet);

  const authEIP3009Artifact = await deployer.loadArtifact("TokenAuthorisable");

  // Note: deployer now has total supply of tokens
  const deployTx = await deployer.deploy(authEIP3009Artifact, [
    AUTH_TOKEN_SETTINGS.name,
    AUTH_TOKEN_SETTINGS.version,
    AUTH_TOKEN_SETTINGS.symbol,
    AUTH_TOKEN_SETTINGS.decimals,
    AUTH_TOKEN_SETTINGS.supply,
  ]);

  const authEIP3009Token = await deployTx.deployed();

  return {
    accounts: {
      sender: deployerWallet,
      receiver,
      randomWallet,
    },
    contract: authEIP3009Token,
    eip712: {
      domain: await getEIP712Domain(authEIP3009Token),
    },
    erc20: { ...AUTH_TOKEN_SETTINGS },
  };
}

const getEIP712Domain = async (contract: Contract) => {
  const { name, version, chainId, verifyingContract } =
    await contract.eip712Domain();
  return {
    name,
    version,
    chainId,
    verifyingContract,
  };
};
