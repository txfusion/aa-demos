// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {PaymentHelper} from "./PaymentHelper.sol";

contract Allowlist is PaymentHelper {
  struct PaymentCondition {
    uint256 amount;
    uint256 timeInterval;
    bool isAllowed; // is payee allowed
  }

  /// @dev payee address => auto payment condition
  mapping(address => PaymentCondition) public conditions;

  /// @dev payee address => block timestamp of last payment
  mapping(address => uint256) public lastPayment;

  modifier onlyAllowlisted() {
    require(
      conditions[msg.sender].isAllowed,
      "Only allowlisted payees can trigger auto-payment"
    );
    // Continue execution if called from the allowlisted payee.
    _;
  }

  function isAutoPaymentAllowed(
    address payee,
    uint256 amount
  ) public view returns (bool) {
    bool isTime = conditions[payee].timeInterval + lastPayment[payee] <=
      block.timestamp;
    bool isAmount = amount <= conditions[payee].amount;

    return isTime && isAmount;
  }

  function isAllowedPayee(address payee) public view returns (bool) {
    return conditions[payee].isAllowed;
  }

  function _addAllowedPayee(
    address payee,
    uint256 amount,
    SubscriptionPeriod timeInterval
  ) internal {
    uint256 paymentDuration = getPaymentDuration(timeInterval);
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
