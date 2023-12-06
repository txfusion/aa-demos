// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

abstract contract IEIP3009Authorisable {
  string internal constant _INVALID_SIGNATURE_ERROR =
    "EIP3009: invalid signature";
  string internal constant _AUTHORIZATION_NOT_YET_VALID =
    "EIP3009: authorization is not yet valid";
  string internal constant _AUTHORIZATION_EXPIRED =
    "EIP3009: authorization has expired";
  string internal constant _AUTHORIZATION_USED_ERROR =
    "EIP3009: authorization is used";
  string internal constant _AUTHORIZATION_UNKNOWN =
    "EIP3009: authorization does not exist";

  // keccak256("QueueTransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)")
  bytes32 public constant QUEUE_TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
    0x8790e5bf3b3c010fae87499a3d3ea57990c7a707fbeb33b32dbbdbecc9122fd1;

  // keccak256("AcceptTransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)")
  bytes32 public constant ACCEPT_TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
    0xf691a8b7f38f3158c9f5e0bee86affb282a4efe5bcd68b44997eb178b661843f;

  // keccak256("RejectTransferWithAuthorization(address from,address to,bytes32 nonce)")
  bytes32 public constant REJECT_TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
    0xd532993334ae2a721b8a5502725ae8ca63faf3200d09cd410b161542e7a8b3e0;

  // keccak256("ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)")
  bytes32 public constant RECEIVE_WITH_AUTHORIZATION_TYPEHASH =
    0xd099cc98ef71107a616c4f0f941f04c322d8e254fe26b3c6668db87aae413de8;

  // keccak256("CancelAuthorization(address sender,address receiver,bytes32 nonce)")
  bytes32 public constant CANCEL_AUTHORIZATION_TYPEHASH =
    0x67b7fcdd5efc94e90823a7fd29865d260c4485f2f999c20ffde06b78ec74ac6e;

  event AuthorizationUsed(
    address indexed sender,
    address indexed receiver,
    bytes32 indexed nonce
  );
  event AuthorizationCanceled(
    address indexed sender,
    address indexed receiver,
    bytes32 indexed nonce
  );

  event TransferQueued(
    address indexed sender,
    address indexed receiver,
    bytes32 indexed nonce,
    uint256 value
  );

  event TransferAccepted(
    address indexed sender,
    address indexed receiver,
    bytes32 indexed nonce,
    uint256 value
  );

  event TransferRejected(
    address indexed sender,
    address indexed receiver,
    bytes32 indexed nonce,
    uint256 value
  );

  event TransferRedeemed(
    address indexed sender,
    address indexed receiver,
    bytes32 indexed nonce,
    uint256 value
  );

  /**
   * @notice Queue a pending transfer with a signed authorization
   *
   * @dev First step of the 2-phase transfer, where both steps were previously in the _transferWithAuthorization
   *
   * @param from                Payer's address (Authorizer)
   * @param to                  Payee's address
   * @param value               Token amount to be transferred
   * @param validAfter          The time after which this is valid (unix time)
   * @param validBefore         The time before which this is valid (unix time)
   * @param nonce               Unique nonce
   * @param v                   v of the signature
   * @param r                   r of the signature
   * @param s                   s of the signature
   */
  function queueTransfer(
    address from,
    address to,
    uint256 value,
    uint256 validAfter,
    uint256 validBefore,
    bytes32 nonce,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external virtual;

  /**
   * @notice Accept a pending transfer with a signed authorization from the payer.
   *
   * @dev Make sure to include 'value', 'validBefore' and 'validAfter' in the signature, omitted here for gas savings.
   * @dev Second step of the 2-phase transfer, where both steps were previously in the _transferWithAuthorization
   *
   * @param from                Payer's address (Authorizer)
   * @param to                  Payee's address
   * @param nonce               Unique nonce
   * @param v                   v of the signature
   * @param r                   r of the signature
   * @param s                   s of the signature
   */
  function acceptTransferWithAuthorization(
    address from,
    address to,
    bytes32 nonce,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external virtual;

  /**
   * @notice Reject a pending transfer with a signed authorization from the payer.
   *
   * @dev Second step of the 2-phase transfer, where both steps were previously in the _transferWithAuthorization
   *
   * @param from                Payer's address (Authorizer)
   * @param to                  Payee's address
   * @param nonce               Unique nonce
   * @param v                   v of the signature
   * @param r                   r of the signature
   * @param s                   s of the signature
   */
  function rejectTransferWithAuthorization(
    address from,
    address to,
    bytes32 nonce,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external virtual;

  /**
   * @notice Redeem a transfer with a signed authorization from the payer. Automatically transfers funds to the payee,
   * skipping the pending state and without need for accept/reject flows.
   *
   * @dev This has an additional check to ensure that the payee's address matches the caller of this function to prevent
   * front-running attacks. (See security considerations)
   * @dev Equivalent of EIP3009's original `receiveWithAuthorization`, renamed for more clarity.
   *
   * @param from                Payer's address (Authorizer)
   * @param to                  Payee's address
   * @param value               Token amount to be received
   * @param validAfter          The time after which this is valid (unix time)
   * @param validBefore         The time before which this is valid (unix time)
   * @param nonce               Unique nonce
   * @param v                   v of the signature
   * @param r                   r of the signature
   * @param s                   s of the signature
   */
  function redeemWithAuthorization(
    address from,
    address to,
    uint256 value,
    uint256 validAfter,
    uint256 validBefore,
    bytes32 nonce,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external virtual;

  /**
   * @notice Cancel the pending transfer and unlock the funds for the sender.
   *
   * @dev Similar to what `cancelWithAuthorization` did previously, with unlocking mechanism for `sender`
   *
   * @param from          Sender's address
   * @param to            Receiver's address
   * @param nonce         Nonce of the authorization
   * @param v             v of the signature
   * @param r             r of the signature
   * @param s             s of the signature
   */
  function cancelAuthorization(
    address from,
    address to,
    bytes32 nonce,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external virtual;

  /**
   * @notice Returns the state of an authorization
   *
   * @dev Nonces are randomly generated 32-byte data unique to the authorizer's
   * address
   * @param from        Sender's address
   * @param to          Receiver's address
   * @param nonce       Nonce of the authorization
   * @return True if the nonce is used
   */
  function authorizationState(
    address from,
    address to,
    bytes32 nonce
  ) external view virtual returns (bool);

  /**
   * @notice Checks transaction data against the signature components (v,r,s) to see if the sender is actually the one who signed the transaction.
   *
   * @param data    abi encoded data structure that was signed
   * @param sender  assumed sender of the transaction
   * @param v       'v' component of the signature
   * @param r       'r' component of the signature
   * @param s       's' component of the signature
   */
  function _checkSender(
    bytes memory data,
    address sender,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) internal view virtual;
}
