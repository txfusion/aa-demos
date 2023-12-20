import { utils } from "zksync-web3";
import { getWallet, getProvider, getToken, readEnv } from "./utils";
import * as ethers from "ethers";

// Put the address of the deployed paymaster here
const PAYMASTER_ADDRESS = readEnv("APPROVAL_PAYMASTER_CONTRACT");

export default async function () {
  const provider = getProvider();
  const wallet = getWallet();
  const token = getToken();

  console.log(
    `ERC20 token balance of the wallet before mint: ${await wallet.getBalance(
      token.address,
    )}`,
  );

  let paymasterBalance = await provider.getBalance(PAYMASTER_ADDRESS);
  console.log(`Paymaster ETH balance is ${paymasterBalance.toString()}`);

  const gasPrice = await provider.getGasPrice();

  // Encoding the "ApprovalBased" paymaster flow's input
  const paymasterParams = utils.getPaymasterParams(PAYMASTER_ADDRESS, {
    type: "ApprovalBased",
    token: token.address,
    minimalAllowance: ethers.BigNumber.from(1),
    innerInput: new Uint8Array(),
  });

  // Estimate gas fee for mint transaction
  const gasLimit = await token.estimateGas.mint(wallet.address, 5, {
    customData: {
      gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
      paymasterParams: paymasterParams,
    },
  });

  const fee = gasPrice.mul(gasLimit.toString());
  console.log("Transaction fee estimation is :>> ", fee.toString());

  console.log(
    `Paymaster ERC20 token balance is now ${await token.balanceOf(
      PAYMASTER_ADDRESS,
    )}`,
  );

  console.log(`Minting 5 tokens for the wallet via paymaster...`);
  await (
    await token.mint(wallet.address, 5, {
      // paymaster info
      customData: {
        paymasterParams: paymasterParams,
        gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
      },
    })
  ).wait();
  paymasterBalance = await provider.getBalance(PAYMASTER_ADDRESS);

  console.log(`Paymaster ETH balance is now ${paymasterBalance.toString()}`);
  console.log(
    `Paymaster ERC20 token balance is now ${await token.balanceOf(
      PAYMASTER_ADDRESS,
    )}`,
  );
  console.log(
    `ERC20 token balance of the the wallet after mint: ${await wallet.getBalance(
      token.address,
    )}`,
  );
}
