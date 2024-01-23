// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import {IEIP3009Authorisable} from "./lib/IEIP3009Authorisable.sol";
import {EIP712Domain} from "./lib/EIP712Domain.sol";
import {IERC20Internal} from "./lib/IERC20Internal.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title Authorisable version of the EIP3009 contract.
/// @author TxFusion
/// @notice Upgraded version of the EIP3009 contract that allows for transfer authorisation on the receiver's side.
/// @dev All transfers (except those initiated by the receiver) will end up in the 'pending' state until the receiver explicitly triggers them to their own address.
abstract contract EIP3009Authorisable is
  IEIP3009Authorisable,
  EIP712,
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

  constructor(
    string memory name,
    string memory version
  ) EIP712(name, version) {}

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
    bytes memory signature
  ) external override {
    // ~~~ Checks ~~~
    // Note: Do we wanna have it be submittable before so it's going to be acceptable in the future
    // require(block.timestamp > validAfter, _AUTHORIZATION_NOT_YET_VALID);
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
    require(_getSigner(data, signature) == from, _INVALID_SIGNATURE_ERROR);
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
    bytes memory signature
  ) external override {
    // ~~~ Checks ~~~
    require(_authorizationStates[from][to][nonce], _AUTHORIZATION_UNKNOWN);

    PendingTransfer memory pt = pendingTransfers[from][to][nonce];
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
    require(_getSigner(data, signature) == to, _INVALID_SIGNATURE_ERROR);
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
    bytes memory signature
  ) external override {
    // ~~~ Checks ~~~
    require(_authorizationStates[from][to][nonce], _AUTHORIZATION_UNKNOWN);

    bytes memory data = abi.encode(
      REJECT_TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
      from,
      to,
      nonce
    );
    require(_getSigner(data, signature) == to, _INVALID_SIGNATURE_ERROR);
    // ~~~~~~~~~~~~~~~

    // Unlock tokens
    PendingTransfer memory pt = pendingTransfers[from][to][nonce];
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
    bytes memory signature
  ) external override {
    // ~~~ Checks
    require(to == msg.sender, _CALLER_NOT_PAYEE);

    require(block.timestamp > validAfter, _AUTHORIZATION_NOT_YET_VALID);
    require(block.timestamp < validBefore, _AUTHORIZATION_EXPIRED);

    PendingTransfer memory pt = pendingTransfers[from][to][nonce]; // Note: perhaps sender queued the transfer

    // If nonce is not free, it has already been used in the past
    if (pt.value == 0) {
      require(
        !_authorizationStates[from][to][nonce],
        _AUTHORIZATION_USED_ERROR
      );
    }

    bytes memory data = abi.encode(
      REDEEM_WITH_AUTHORIZATION_TYPEHASH,
      from,
      to,
      value,
      validAfter,
      validBefore,
      nonce
    );
    require(_getSigner(data, signature) == from, _INVALID_SIGNATURE_ERROR); // Note: receiver should reuse sender's signature
    // ~~~~~~~~~~~~~~~

    // Transfer tokens from sender to receiver
    if (pt.value == value) {
      _transfer(address(this), to, pt.value);
      delete pendingTransfers[from][to][nonce];
    } else {
      _transfer(from, to, value);
      _authorizationStates[from][to][nonce] = true;
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
    bytes memory signature
  ) external override {
    // ~~~ Checks ~~~
    require(_authorizationStates[from][to][nonce], _AUTHORIZATION_UNKNOWN);

    bytes memory data = abi.encode(
      CANCEL_AUTHORIZATION_TYPEHASH,
      from,
      to,
      nonce
    );
    require(_getSigner(data, signature) == from, _INVALID_SIGNATURE_ERROR);
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
  function _getSigner(
    bytes memory data,
    bytes memory signature
  ) internal view override returns (address) {
    bytes32 digest = _hashTypedDataV4(keccak256(data));
    return ECDSA.recover(digest, signature);
  }
}
