import {
  TypedDataSigner,
  TypedDataDomain,
} from "@ethersproject/abstract-signer";
import { EIP712TypeDefinition } from "./types";

export async function signTypedData(
  domain: TypedDataDomain,
  types: EIP712TypeDefinition,
  value: any,
  signer: TypedDataSigner,
): Promise<string> {
  try {
    const signature = await signer._signTypedData(domain, types, value);
    return signature;
  } catch (error) {
    console.log("[signTypedData]::error ", error);
    return "";
  }
}
