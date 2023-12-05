// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

abstract contract IERC20Internal {
  mapping(address => uint256) internal _balances;
  mapping(address => mapping(address => uint256)) internal _allowances;

  uint256 internal _totalSupply;
  string internal _name;
  string internal _version;
  string internal _symbol;
  uint8 internal _decimals;

  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);

  constructor(
    uint256 totalSupply_,
    string memory name_,
    string memory version_,
    string memory symbol_,
    uint8 decimals_
  ) {
    _totalSupply = totalSupply_;
    _name = name_;
    _version = version_;
    _symbol = symbol_;
    _decimals = decimals_;
  }

  function _transfer(
    address sender,
    address recipient,
    uint256 amount
  ) internal virtual;

  function _approve(
    address owner,
    address spender,
    uint256 amount
  ) internal virtual;

  function _increaseAllowance(
    address owner,
    address spender,
    uint256 increment
  ) internal virtual;

  function _decreaseAllowance(
    address owner,
    address spender,
    uint256 decrement
  ) internal virtual;

  function _mint(address account, uint256 amount) internal virtual;

  function _burn(address account, uint256 amount) internal virtual;
}
