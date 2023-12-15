// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {PaymentHelper, PaymentCondition, PaymentInterval} from "./libraries/PaymentHelper.sol";

contract Allowlist {
  using PaymentHelper for PaymentInterval;

  /// @dev payee address => auto payment condition
  mapping(address => PaymentCondition) public conditions;

  /// @dev payee address => block timestamp of last payment
  mapping(address => uint256) public lastPayment;

  modifier onlyAllowedAutoPayment(uint256 amount) {
    PaymentCondition memory condition = conditions[msg.sender];
    require(
      condition.isAllowed,
      "Only allowed payees can trigger auto-payment"
    );
    require(
      condition.timeInterval + lastPayment[msg.sender] <= block.timestamp,
      "Only after allowed auto-payment time interval"
    );
    require(amount <= condition.amount, "Only allowed auto-payment amount");
    // Continue execution if all payment conditions are satisfied.
    _;
  }

  function _addAllowedPayee(
    address payee,
    uint256 amount,
    PaymentInterval timeInterval
  ) internal {
    uint256 paymentDuration = timeInterval.getPaymentDuration();
    conditions[payee] = PaymentCondition(amount, paymentDuration, true);
  }

  function _removeAllowedPayee(address payee) internal {
    delete conditions[payee];
  }

  function getPaymentConditions(
    address _payee
  ) public view returns (uint256, uint256) {
    return (conditions[_payee].amount, conditions[_payee].timeInterval);
  }
}
