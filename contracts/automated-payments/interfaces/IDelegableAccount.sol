// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IDelegableAccount {
  event AllowedPayeeAdded(address indexed payee);
  event AllowedPayeeRemoved(address indexed payee);
  event FailedRemovingSubscriber(address indexed subscriber);
  error FailedAddingSubscriber(address subscriber);

  function executeAutoPayment(uint256 _ethAmount) external;
}
