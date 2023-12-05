// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import {IERC20Internal} from "./IERC20Internal.sol";
import {EIP712Domain} from "./EIP712Domain.sol";
import {EIP712} from "./EIP712.sol";

/// @title Base contract for the EIP3009 standard.
/// @author Coinbase
/// @notice Base contract for the EIP3009 standard, that supports gassless transfers for involved parties.
/// @dev Transfers from and to users' addresses can be initiated by anyone just by having the necessary signature.
abstract contract EIP3009 is IERC20Internal, EIP712Domain {
  constructor(
    uint256 tokenTotalSupply,
    string memory tokenName,
    string memory tokenVersion,
    string memory tokenSymbol,
    uint8 tokenDecimals
  ) IERC20Internal(0, tokenName, tokenVersion, tokenSymbol, tokenDecimals) {
    DOMAIN_SEPARATOR = EIP712.makeDomainSeparator(tokenName, tokenVersion);

    _mint(msg.sender, tokenTotalSupply);
  }

  // keccak256("ReceiveWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)")
  bytes32 public constant RECEIVE_WITH_AUTHORIZATION_TYPEHASH =
    0xd099cc98ef71107a616c4f0f941f04c322d8e254fe26b3c6668db87aae413de8;

  // keccak256("CancelAuthorization(address sender,address receiver,bytes32 nonce)")
  bytes32 public constant CANCEL_AUTHORIZATION_TYPEHASH =
    0x67b7fcdd5efc94e90823a7fd29865d260c4485f2f999c20ffde06b78ec74ac6e;

  /**
   * @dev sender address => receiver address => nonce => state (true = used / false = unused)
   */
  mapping(address => mapping(address => mapping(bytes32 => bool)))
    internal _authorizationStates;

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

  string internal constant _INVALID_SIGNATURE_ERROR =
    "EIP3009: invalid signature";
  string internal constant _AUTHORIZATION_NOT_YET_VALID =
    "EIP3009: authorization is not yet valid";
  string internal constant _AUTHORIZATION_EXPIRED =
    "EIP3009: authorization has expired";
  string internal constant _AUTHORIZATION_USED_ERROR =
    "EIP3009: authorization is used";

  /**
   * @notice Checks timestamps and nonce of the authorized transaction.
   */
  modifier checkAuthorization(
    address from,
    address to,
    uint256 validAfter,
    uint256 validBefore,
    bytes32 nonce
  ) {
    require(block.timestamp > validAfter, _AUTHORIZATION_NOT_YET_VALID);
    require(block.timestamp < validBefore, _AUTHORIZATION_EXPIRED);
    require(!_authorizationStates[from][to][nonce], _AUTHORIZATION_USED_ERROR);

    _;
  }

  /**
   * @notice Checks transaction data against the signature components (v,r,s) to see if the sender is actually the one who signed the transaction.
   * @param data - abi encoded data structure that was signed
   * @param sender - assumed sender of the transaction
   * @param v - 'v' component of the signature
   * @param r - 'r' component of the signature
   * @param s - 's' component of the signature
   */
  function _checkSender(
    bytes memory data,
    address sender,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) internal view {
    require(
      EIP712.recover(DOMAIN_SEPARATOR, v, r, s, data) == sender,
      _INVALID_SIGNATURE_ERROR
    );
  }

  /**
   * @notice Execute a transfer with a signed authorization
   * @param typeHash            Hash of the initiated operation
   * @param from                Payer's address (Authorizer)
   * @param currentTokenOwner   Current owner of the tokens that are to be sent (either this contract or payer)
   * @param to                  Payee's address
   * @param value               Token amount to be transferred
   * @param validAfter          The time after which this is valid (unix time)
   * @param validBefore         The time before which this is valid (unix time)
   * @param nonce               Unique nonce
   * @param v                   v of the signature
   * @param r                   r of the signature
   * @param s                   s of the signature
   */
  function _transferWithAuthorization(
    bytes32 typeHash,
    address from,
    address currentTokenOwner,
    address to,
    uint256 value,
    uint256 validAfter,
    uint256 validBefore,
    bytes32 nonce,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) internal checkAuthorization(from, to, validAfter, validBefore, nonce) {
    bytes memory data = abi.encode(
      typeHash,
      from,
      to,
      value,
      validAfter,
      validBefore,
      nonce
    );
    _checkSender(data, from, v, r, s);

    _authorizationStates[from][to][nonce] = true;
    emit AuthorizationUsed(from, to, nonce);

    _transfer(currentTokenOwner, to, value);
  }

  /**
   * @notice Returns the state of an authorization
   * @dev Nonces are randomly generated 32-byte data unique to the authorizer's
   * address
   * @param sender        Sender's address
   * @param receiver      Receiver's address
   * @param nonce         Nonce of the authorization
   * @return True if the nonce is used
   */
  function authorizationState(
    address sender,
    address receiver,
    bytes32 nonce
  ) external view returns (bool) {
    return _authorizationStates[sender][receiver][nonce];
  }

  /**
   * @notice Attempt to cancel an authorization
   * @param sender        Sender's address
   * @param receiver      Receiver's address
   * @param nonce         Nonce of the authorization
   * @param v             v of the signature
   * @param r             r of the signature
   * @param s             s of the signature
   */
  function _cancelAuthorization(
    address sender,
    address receiver,
    bytes32 nonce,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) internal {
    require(
      !_authorizationStates[sender][receiver][nonce],
      _AUTHORIZATION_USED_ERROR
    );

    bytes memory data = abi.encode(
      CANCEL_AUTHORIZATION_TYPEHASH,
      sender,
      nonce
    );
    _checkSender(data, sender, v, r, s);

    _authorizationStates[sender][receiver][nonce] = true;
    emit AuthorizationCanceled(sender, receiver, nonce);
  }
}
