// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IPaymentHelper} from "./interfaces/IPaymentHelper.sol";

contract PaymentHelper is IPaymentHelper {
  uint256 private constant MINUTE = 1 minutes;
  uint256 private constant DAY = 1 days;
  uint256 private constant WEEK = 7 days;
  uint256 private constant MONTH = 2628288; // average month duration in seconds

  function getPaymentDuration(
    PaymentPeriod timeInterval
  ) public pure returns (uint256 paymentDuration) {
    if (timeInterval == PaymentPeriod.MINUTE) {
      paymentDuration = MINUTE;
    } else if (timeInterval == PaymentPeriod.DAILY) {
      paymentDuration = DAY;
    } else if (timeInterval == PaymentPeriod.WEEKLY) {
      paymentDuration = WEEK;
    } else if (timeInterval == PaymentPeriod.MONTHLY) {
      paymentDuration = MONTH;
    } else {
      revert InvalidTimeInterval();
    }
  }
}
