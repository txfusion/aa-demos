// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Transaction} from "@matterlabs/zksync-contracts/l2/system-contracts/libraries/TransactionHelper.sol";

import "./PaymentCondition.sol";

contract AmountPaymentCondition is PaymentCondition {
  /// @dev subscriber address => amount uint256
  mapping(address => uint256) paymentAmounts;

  constructor(string memory _name) PaymentCondition(_name) {}

  function canExecutePayment(
    Transaction calldata _transaction
  ) external view override returns (bool) {
    return
      _transaction.value == paymentAmounts[address(uint160(_transaction.to))];
  }
}
