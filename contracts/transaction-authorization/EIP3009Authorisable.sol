// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import {IEIP3009Authorisable} from "./lib/IEIP3009Authorisable.sol";
import {EIP712Domain} from "./lib/EIP712Domain.sol";
import {IERC20Internal} from "./lib/IERC20Internal.sol";
import {EIP712} from "./lib/EIP712.sol";

/// @title Authorisable version of the EIP3009 contract.
/// @author TxFusion
/// @notice Upgraded version of the EIP3009 contract that allows for transfer authorisation on the receiver's side.
/// @dev All transfers (except those initiated by the receiver) will end up in the 'pending' state until the receiver explicitly triggers them to their own address.
abstract contract EIP3009Authorisable is
  IEIP3009Authorisable,
  EIP712Domain,
  IERC20Internal
{
  struct PendingTransfer {
    uint256 value;
    uint256 validBefore;
    uint256 validAfter;
  }

  /**
   * @dev sender address => receiver address => nonce => state (true = used / false = unused)
   */
  mapping(address => mapping(address => mapping(bytes32 => PendingTransfer)))
    public pendingTransfers;

  /**
   * @dev sender address => receiver address => nonce => state (true = used / false = unused)
   */
  mapping(address => mapping(address => mapping(bytes32 => bool)))
    internal _authorizationStates;

  /**
   * @inheritdoc IEIP3009Authorisable
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
  ) external override {
    // ~~~ Checks ~~~
    require(block.timestamp > validAfter, _AUTHORIZATION_NOT_YET_VALID);
    require(block.timestamp < validBefore, _AUTHORIZATION_EXPIRED);
    require(!_authorizationStates[from][to][nonce], _AUTHORIZATION_USED_ERROR);

    bytes memory data = abi.encode(
      QUEUE_TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
      from,
      to,
      value,
      validAfter,
      validBefore,
      nonce
    );
    _checkSender(data, from, v, r, s);
    // ~~~~~~~~~~~~~~~

    // Lock tokens
    _transfer(from, address(this), value);

    // Store pending transfer
    pendingTransfers[from][to][nonce] = PendingTransfer({
      value: value,
      validBefore: validBefore,
      validAfter: validAfter
    });
    emit TransferQueued(from, to, nonce, value);

    // Reserve nonce
    _authorizationStates[from][to][nonce] = true;
    emit AuthorizationUsed(from, to, nonce);
  }

  /**
   * @inheritdoc IEIP3009Authorisable
   */
  function acceptTransferWithAuthorization(
    address from,
    address to,
    bytes32 nonce,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external override {
    // ~~~ Checks ~~~
    require(_authorizationStates[from][to][nonce], _AUTHORIZATION_UNKNOWN);

    PendingTransfer memory pt = pendingTransfers[from][to][nonce];
    require(block.timestamp > pt.validAfter, _AUTHORIZATION_NOT_YET_VALID);
    require(block.timestamp < pt.validBefore, _AUTHORIZATION_EXPIRED);

    bytes memory data = abi.encode(
      ACCEPT_TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
      from,
      to,
      pt.value,
      pt.validAfter,
      pt.validBefore,
      nonce
    );
    _checkSender(data, from, v, r, s);
    // ~~~~~~~~~~~~~~~

    // Unlock tokens
    _transfer(address(this), to, pt.value);

    // Remove pending transfer
    delete pendingTransfers[from][to][nonce];
    emit TransferAccepted(from, to, nonce, pt.value);
  }

  /**
   * @inheritdoc IEIP3009Authorisable
   */
  function rejectTransferWithAuthorization(
    address from,
    address to,
    bytes32 nonce,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external override {
    // ~~~ Checks ~~~
    require(_authorizationStates[from][to][nonce], _AUTHORIZATION_UNKNOWN);

    PendingTransfer memory pt = pendingTransfers[from][to][nonce];
    require(block.timestamp > pt.validAfter, _AUTHORIZATION_NOT_YET_VALID);
    require(block.timestamp < pt.validBefore, _AUTHORIZATION_EXPIRED);

    bytes memory data = abi.encode(
      REJECT_TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
      from,
      to,
      nonce
    );
    _checkSender(data, from, v, r, s);
    // ~~~~~~~~~~~~~~~

    // Unlock tokens
    _transfer(address(this), from, pt.value);

    // Remove pending transfer
    delete pendingTransfers[from][to][nonce];
    emit TransferRejected(from, to, nonce, pt.value);
  }

  /**
   * @inheritdoc IEIP3009Authorisable
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
  ) external override {
    // ~~~ Checks
    require(to == msg.sender, "EIP3009Authorisable: caller must be the payee");

    require(block.timestamp > validAfter, _AUTHORIZATION_NOT_YET_VALID);
    require(block.timestamp < validBefore, _AUTHORIZATION_EXPIRED);
    require(!_authorizationStates[from][to][nonce], _AUTHORIZATION_USED_ERROR);

    bytes memory data = abi.encode(
      RECEIVE_WITH_AUTHORIZATION_TYPEHASH,
      from,
      to,
      value,
      validAfter,
      validBefore,
      nonce
    );
    _checkSender(data, from, v, r, s);
    // ~~~~~~~~~~~~~~~

    // Transfer tokens from sender to receiver
    PendingTransfer memory pt = pendingTransfers[from][to][nonce]; // Note: perhaps sender queued the transfer
    if (pt.value == value) {
      _transfer(address(this), to, pt.value);
      delete pendingTransfers[from][to][nonce];
    } else {
      _transfer(from, to, value);
    }

    emit TransferRedeemed(from, to, nonce, value);
  }

  /**
   * @inheritdoc IEIP3009Authorisable
   */
  function cancelAuthorization(
    address from,
    address to,
    bytes32 nonce,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external override {
    // ~~~ Checks ~~~
    require(_authorizationStates[from][to][nonce], _AUTHORIZATION_UNKNOWN);

    bytes memory data = abi.encode(
      CANCEL_AUTHORIZATION_TYPEHASH,
      from,
      to,
      nonce
    );
    _checkSender(data, from, v, r, s);
    // ~~~~~~~~~~~~~~~

    // Unlock tokens
    PendingTransfer memory pt = pendingTransfers[from][to][nonce];
    _transfer(address(this), from, pt.value);

    // Remove pending transfer
    delete pendingTransfers[from][to][nonce];
    emit AuthorizationCanceled(from, to, nonce);
  }

  /**
   * @inheritdoc IEIP3009Authorisable
   */
  function authorizationState(
    address from,
    address to,
    bytes32 nonce
  ) external view override returns (bool) {
    return _authorizationStates[from][to][nonce];
  }

  /**
   * @inheritdoc IEIP3009Authorisable
   */
  function _checkSender(
    bytes memory data,
    address sender,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) internal view override {
    require(
      EIP712.recover(DOMAIN_SEPARATOR, v, r, s, data) == sender,
      _INVALID_SIGNATURE_ERROR
    );
  }
}
