// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IPaymentHelper {
  error InvalidtimeInterval();

  enum SubscriptionPeriod {
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
