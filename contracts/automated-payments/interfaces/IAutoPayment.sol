// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IPaymentHelper} from "./IPaymentHelper.sol";

interface IAutoPayment is IPaymentHelper {
  event SubscriberAdded(
    address indexed _subscriber,
    uint256 indexed _amount,
    uint256 indexed _timeInterval
  );
  event SubscriberRemoved(address indexed _subscriber);

  function addSubscriber(uint256 amount, PaymentPeriod timeInterval) external;

  function removeSubscriber() external;
}
