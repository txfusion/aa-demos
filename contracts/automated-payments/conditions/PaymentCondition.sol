// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Transaction} from "@matterlabs/zksync-contracts/l2/system-contracts/libraries/TransactionHelper.sol";

abstract contract PaymentCondition {
  string public name;

  constructor(string memory _name) {
    name = _name;
  }

  function canExecutePayment(
    Transaction calldata _transaction
  ) external view virtual returns (bool);
}
