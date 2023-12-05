import {
  deployContract,
  getWallet,
  getProvider,
  chargePaymaster,
  getToken,
} from "./utils";

const TOKEN_AMOUNT_TO_MINT = 100;
export default async function () {
  const token = getToken();
  const paymaster = await deployContract("ApprovalPaymaster", [token.address]);

  await chargePaymaster(paymaster.address);

  const paymasterBalance = await getProvider().getBalance(paymaster.address);
  console.log(`Paymaster ETH balance is now ${paymasterBalance.toString()}`);

  const wallet = getWallet();
  // Supplying the ERC20 tokens to the wallet:
  await (await token.mint(wallet.address, TOKEN_AMOUNT_TO_MINT)).wait();

  console.log(`Minted ${TOKEN_AMOUNT_TO_MINT} tokens for the wallet`);
  console.log(`Done!`);
}
