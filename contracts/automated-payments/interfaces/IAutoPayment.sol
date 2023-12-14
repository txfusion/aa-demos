// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IPaymentHelper} from "./IPaymentHelper.sol";

interface IAutoPayment is IPaymentHelper {
  function addSubscriber(
    uint256 amount,
    SubscriptionPeriod timeInterval
  ) external;

  function removeSubscriber() external;
}
