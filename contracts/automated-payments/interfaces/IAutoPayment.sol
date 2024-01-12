// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {PaymentInterval} from "../libraries/PaymentHelper.sol";

interface IAutoPayment {
  event SubscriberAdded(
    address indexed _subscriber,
    uint256 indexed _amount,
    uint256 indexed _timeInterval
  );
  event SubscriberRemoved(address indexed _subscriber);
  event PaymentExecuted(address indexed _subscriber, uint256 indexed amount);

  function addSubscriber(uint256 amount, PaymentInterval timeInterval) external;

  function removeSubscriber() external;
}
