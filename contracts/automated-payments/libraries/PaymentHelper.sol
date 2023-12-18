// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

enum PaymentInterval {
  MINUTE,
  DAILY,
  WEEKLY,
  MONTHLY
}

struct PaymentCondition {
  uint256 amount;
  uint256 timeInterval;
  bool isAllowed;
}

error InvalidTimeInterval();

library PaymentHelper {
  uint256 private constant MINUTE = 1 minutes;
  uint256 private constant DAY = 1 days;
  uint256 private constant WEEK = 7 days;
  uint256 private constant MONTH = 2628288; // average month duration in seconds

  function getPaymentDuration(
    PaymentInterval timeInterval
  ) internal pure returns (uint256 paymentDuration) {
    if (timeInterval == PaymentInterval.MINUTE) {
      paymentDuration = MINUTE;
    } else if (timeInterval == PaymentInterval.DAILY) {
      paymentDuration = DAY;
    } else if (timeInterval == PaymentInterval.WEEKLY) {
      paymentDuration = WEEK;
    } else if (timeInterval == PaymentInterval.MONTHLY) {
      paymentDuration = MONTH;
    } else {
      revert InvalidTimeInterval();
    }
  }
}
