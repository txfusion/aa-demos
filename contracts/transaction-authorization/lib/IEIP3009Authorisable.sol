// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

interface IEIP3009Authorisable {
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

  /**
   * @notice Queue a pending transfer with a signed authorization
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
  ) external;

  /**
   * @notice Accept a pending transfer with a signed authorization from the payer.
   * @dev Make sure to include 'value', 'validBefore' and 'validAfter' in the signature, omitted here for gas savings.
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
  ) external;

  /**
   * @notice Reject a pending transfer with a signed authorization from the payer.
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
  ) external;

  /**
   * @notice Receive a transfer with a signed authorization from the payer. Automatically transfers funds to the payee, without need for accept/reject flows.
   * @dev This has an additional check to ensure that the payee's address matches the caller of this function to prevent
   * front-running attacks. (See security considerations)
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
  function receiveWithAuthorization(
    address from,
    address to,
    uint256 value,
    uint256 validAfter,
    uint256 validBefore,
    bytes32 nonce,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external;
}
