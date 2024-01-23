// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IPaymentHelper {
  error InvalidTimeInterval();

  enum PaymentPeriod {
    MINUTE,
    DAILY,
    WEEKLY,
    MONTHLY
  }

  struct SubscriptionCondition {
    uint256 amount;
    uint256 paymentDuration;
  }
}
