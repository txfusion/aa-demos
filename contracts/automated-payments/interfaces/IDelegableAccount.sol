// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IDelegableAccount {
  event SubscriberAdded();
  event FailedAddingSubscriber();
  event SubscriberRemoved();
  event FailedRemovingSubscriber();

  error InvalidPayment();

  function executeAutoPayment(uint256 _ethAmount) external;
}
