// SPDX-License-Identifier: MIT

pragma solidity 0.8.17;

abstract contract IERC20Internal {
  event Transfer(address indexed from, address indexed to, uint256 value);
  event Approval(address indexed owner, address indexed spender, uint256 value);

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
