// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IPaymentHelper} from "./IPaymentHelper.sol";

interface IAutoPayment is IPaymentHelper, IERC165 {
  function addSubscriber(
    uint256 amount,
    SubscriptionPeriod timeInterval
  ) external;

  function removeSubscriber() external;
}
