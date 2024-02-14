import { verify } from "./utils";

const CONTRACT_ADDRESS = "";

export default async function () {
  if (!CONTRACT_ADDRESS) {
    console.error("⛔️ Provide address of the contract to interact with!");
    return;
  }

  const res = await verify(CONTRACT_ADDRESS);
  console.log(res);
}
