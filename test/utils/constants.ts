import { utils as ethersUtils, constants } from "ethers";

export const PROVIDER_URL = "http://localhost:3050";
export const CHAIN_ID = 270;

export const EIP3009_TYPEHASHES = {
  QUEUE_TRANSFER: ethersUtils.keccak256(
    ethersUtils.toUtf8Bytes(
      "QueueTransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)",
    ),
  ),
  ACCEPT_TRANSFER: ethersUtils.keccak256(
    ethersUtils.toUtf8Bytes(
      "AcceptTransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)",
    ),
  ),
  REJECT_TRANSFER: ethersUtils.keccak256(
    ethersUtils.toUtf8Bytes(
      "RejectTransferWithAuthorization(address from,address to,bytes32 nonce)",
    ),
  ),
  RECEIVE: ethersUtils.keccak256(
    ethersUtils.toUtf8Bytes(
      "ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)",
    ),
  ),
  CANCEL_AUTHORIZATION: ethersUtils.keccak256(
    ethersUtils.toUtf8Bytes(
      "CancelAuthorization(address sender,address receiver,bytes32 nonce)",
    ),
  ),
};