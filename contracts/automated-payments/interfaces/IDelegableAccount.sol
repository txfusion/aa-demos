// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IDelegableAccount {
  function executeAutoPayment(uint256 _ethAmount) external;
}
