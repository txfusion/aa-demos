// SPDX-License-Identifier: MIT

import {IERC20Internal} from "./lib/IERC20Internal.sol";
import {EIP712} from "./lib/EIP712.sol";
import {EIP3009Authorisable} from "./EIP3009Authorisable.sol";

contract TokenAuthorisable is IERC20Internal, EIP3009Authorisable {
  mapping(address => uint256) internal _balances;
  mapping(address => mapping(address => uint256)) internal _allowances;

  uint256 internal _totalSupply;
  string internal _name;
  string internal _version;
  string internal _symbol;
  uint8 internal _decimals;

  constructor(
    string memory tokenName,
    string memory tokenVersion,
    string memory tokenSymbol,
    uint8 tokenDecimals,
    uint256 tokenTotalSupply
  ) EIP3009Authorisable(_name, _version) {
    _name = tokenName;
    _version = tokenVersion;
    _symbol = tokenSymbol;
    _decimals = tokenDecimals;

    _mint(msg.sender, tokenTotalSupply);
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
