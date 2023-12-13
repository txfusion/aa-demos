// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";

interface IDelegableAccount is IERC165 {
  function executeAutoPayment(uint256 _ethAmount) external;
}
