// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

abstract contract IEIP3009Authorisable {
  string internal constant _CALLER_NOT_PAYEE =
    "EIP3009: caller must be the payee";
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

  bytes32 public constant QUEUE_TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
    keccak256(
      "QueueTransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );

  bytes32 public constant ACCEPT_TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
    keccak256(
      "AcceptTransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );

  bytes32 public constant REJECT_TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
    keccak256(
      "RejectTransferWithAuthorization(address from,address to,bytes32 nonce)"
    );

  bytes32 public constant REDEEM_WITH_AUTHORIZATION_TYPEHASH =
    keccak256(
      "RedeemWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)"
    );

  bytes32 public constant CANCEL_AUTHORIZATION_TYPEHASH =
    keccak256("CancelAuthorization(address from,address to,bytes32 nonce)");

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
   * @param signature           Signed queue message
   */
  function queueTransfer(
    address from,
    address to,
    uint256 value,
    uint256 validAfter,
    uint256 validBefore,
    bytes32 nonce,
    bytes memory signature
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
   * @param signature           Signed accept message
   */
  function acceptTransferWithAuthorization(
    address from,
    address to,
    bytes32 nonce,
    bytes memory signature
  ) external virtual;

  /**
   * @notice Reject a pending transfer with a signed authorization from the payer.
   *
   * @dev Second step of the 2-phase transfer, where both steps were previously in the _transferWithAuthorization
   *
   * @param from                Payer's address (Authorizer)
   * @param to                  Payee's address
   * @param nonce               Unique nonce
   * @param signature           Signed reject message
   */
  function rejectTransferWithAuthorization(
    address from,
    address to,
    bytes32 nonce,
    bytes memory signature
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
   * @param signature           Signed redeem message
   */
  function redeemWithAuthorization(
    address from,
    address to,
    uint256 value,
    uint256 validAfter,
    uint256 validBefore,
    bytes32 nonce,
    bytes memory signature
  ) external virtual;

  /**
   * @notice Cancel the pending transfer and unlock the funds for the sender.
   *
   * @dev Similar to what `cancelWithAuthorization` did previously, with unlocking mechanism for `sender`
   *
   * @param from          Sender's address
   * @param to            Receiver's address
   * @param nonce         Nonce of the authorization
   * @param signature     Signed cancel message
   */
  function cancelAuthorization(
    address from,
    address to,
    bytes32 nonce,
    bytes memory signature
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
   * @notice Extracts the signer of the transaction by using the signature and the data that the user signed.
   *
   * @param data    abi encoded data structure that was signed
   * @param signature user's signature
   */
  function _getSigner(
    bytes memory data,
    bytes memory signature
  ) internal view virtual returns (address);
}
