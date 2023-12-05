// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

import {IERC20Internal} from "./lib/IERC20Internal.sol";
import {EIP3009} from "./lib/EIP3009.sol";
import {IEIP3009Authorisable} from "./lib/IEIP3009Authorisable.sol";
import {EIP2612} from "./lib/EIP2612.sol";
import {EIP712} from "./lib/EIP712.sol";

/// @title Authorisable version of the EIP3009 contract.
/// @author TxFusion
/// @notice Upgraded version of the EIP3009 contract that allows for transfer authorisation on the receiver's side.
/// @dev All transfer (except those initiated by the receiver) will end up in the 'pending' state until the receiver explicitly triggers them to their own address.
contract EIP3009Authorisable is EIP3009, EIP2612, IEIP3009Authorisable {
  constructor(
    uint256 tokenTotalSupply,
    string memory tokenName,
    string memory tokenVersion,
    string memory tokenSymbol,
    uint8 tokenDecimals
  )
    EIP3009(
      tokenTotalSupply,
      tokenName,
      tokenVersion,
      tokenSymbol,
      tokenDecimals
    )
  {}

  // keccak256("QueueTransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)")
  bytes32 public constant QUEUE_TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
    0x8790e5bf3b3c010fae87499a3d3ea57990c7a707fbeb33b32dbbdbecc9122fd1;

  // keccak256("AcceptTransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)")
  bytes32 public constant ACCEPT_TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
    0xf691a8b7f38f3158c9f5e0bee86affb282a4efe5bcd68b44997eb178b661843f;

  // keccak256("RejectTransferWithAuthorization(address from,address to,bytes32 nonce)")
  bytes32 public constant REJECT_TRANSFER_WITH_AUTHORIZATION_TYPEHASH =
    0xd532993334ae2a721b8a5502725ae8ca63faf3200d09cd410b161542e7a8b3e0;

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
  ) external checkAuthorization(from, to, validAfter, validBefore, nonce) {
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

    // TODO: Figure out if this is to be done upon transfer or upon queue
    // _authorizationStates[from][to][nonce] = true;
    // emit AuthorizationUsed(from, to, nonce);

    _transfer(from, address(this), value);

    pendingTransfers[from][to][nonce] = PendingTransfer({
      value: value,
      validBefore: validBefore,
      validAfter: validAfter
    });
    emit TransferQueued(from, to, nonce, value);
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
  ) external {
    PendingTransfer memory pt = pendingTransfers[from][to][nonce];

    _transferWithAuthorization(
      ACCEPT_TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
      from,
      address(this),
      to,
      pt.value,
      pt.validAfter,
      pt.validBefore,
      nonce,
      v,
      r,
      s
    );

    delete pendingTransfers[from][to][nonce];
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
  ) external {
    PendingTransfer memory pt = pendingTransfers[from][to][nonce];

    bytes memory data = abi.encode(
      REJECT_TRANSFER_WITH_AUTHORIZATION_TYPEHASH,
      from,
      to,
      nonce
    );
    _checkSender(data, from, v, r, s);

    _transfer(address(this), from, pt.value);

    delete pendingTransfers[from][to][nonce];
    delete _authorizationStates[from][to][nonce];

    emit TransferRejected(from, to, nonce, pt.value);
  }

  /**
   * @inheritdoc IEIP3009Authorisable
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
  ) external {
    require(to == msg.sender, "EIP3009Authorisable: caller must be the payee");

    _transferWithAuthorization(
      RECEIVE_WITH_AUTHORIZATION_TYPEHASH,
      from,
      from,
      to,
      value,
      validAfter,
      validBefore,
      nonce,
      v,
      r,
      s
    );

    delete pendingTransfers[from][to][nonce];
  }

  /**
   * TODO: Figure out the usecase of this
   *
   * @notice Attempt to cancel an authorization
   * @param sender        Sender's address
   * @param receiver      Receiver's address
   * @param nonce         Nonce of the authorization
   * @param v             v of the signature
   * @param r             r of the signature
   * @param s             s of the signature
   */
  function cancelAuthorization(
    address sender,
    address receiver,
    bytes32 nonce,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external {
    _cancelAuthorization(sender, receiver, nonce, v, r, s);

    delete pendingTransfers[sender][receiver][nonce];
  }

  function _transfer(
    address sender,
    address recipient,
    uint256 amount
  ) internal override {
    require(sender != address(0), "ERC20: transfer from the zero address");
    require(recipient != address(0), "ERC20: transfer to the zero address");

    uint256 _senderBalance = _balances[sender];
    require(_senderBalance >= amount, "ERC20: transfer amount exceeds balance");

    _balances[sender] -= amount;
    _balances[recipient] += amount;

    emit Transfer(sender, recipient, amount);
  }

  // [ERC20] TODO: Figure out what to do with these
  function _mint(address account, uint256 amount) internal override {
    require(
      account != address(0),
      "EIP3009Authorisable: mint to the zero address"
    );

    _totalSupply += amount;
    _balances[account] += amount;

    emit Transfer(address(0), account, amount);
  }

  function _burn(address account, uint256 amount) internal override {
    require(
      account != address(0),
      "EIP3009Authorisable: burn from the zero address"
    );

    uint256 _balance = _balances[account];
    require(
      _balance >= amount,
      "EIP3009Authorisable: burn amount exceeds balance"
    );

    _balances[account] = _balance - amount;
    _totalSupply = _totalSupply - amount;

    emit Transfer(account, address(0), amount);
  }

  // [ERC20] TODO: (Potentially) allow 'transferFrom' and 'approve' flows.
  // Note: currency, _allowances aren't used for anything.
  function approve(address spender, uint256 amount) external returns (bool) {
    _approve(msg.sender, spender, amount);
    return true;
  }

  function _approve(
    address owner,
    address spender,
    uint256 amount
  ) internal override {
    require(owner != address(0), "ERC20: approve from the zero address");
    require(spender != address(0), "ERC20: approve to the zero address");

    _allowances[owner][spender] = amount;
    emit Approval(owner, spender, amount);
  }

  function increaseAllowance(
    address spender,
    uint256 addedValue
  ) external returns (bool) {
    _increaseAllowance(msg.sender, spender, addedValue);
    return true;
  }

  function _increaseAllowance(
    address owner,
    address spender,
    uint256 addedValue
  ) internal override {
    _approve(owner, spender, _allowances[owner][spender] + addedValue);
  }

  function decreaseAllowance(
    address spender,
    uint256 subtractedValue
  ) external returns (bool) {
    _decreaseAllowance(msg.sender, spender, subtractedValue);
    return true;
  }

  function _decreaseAllowance(
    address owner,
    address spender,
    uint256 subtractedValue
  ) internal override {
    uint256 _allowance = _allowances[owner][spender];
    require(
      _allowance >= subtractedValue,
      "ERC20: decreased allowance below zero"
    );

    _approve(owner, spender, _allowance - subtractedValue);
  }

  function name() external view returns (string memory) {
    return _name;
  }

  function version() public view returns (string memory) {
    return _version;
  }

  function symbol() external view returns (string memory) {
    return _symbol;
  }

  function decimals() external view returns (uint8) {
    return _decimals;
  }

  function totalSupply() external view returns (uint256) {
    return _totalSupply;
  }

  function balanceOf(address account) external view returns (uint256) {
    return _balances[account];
  }

  function allowance(
    address owner,
    address spender
  ) external view returns (uint256) {
    return _allowances[owner][spender];
  }
}
