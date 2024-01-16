// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IAutoPaymentFactory {
  event AutoPaymentCreated(
    address indexed autoPaymentAddress
  );
  function createNewAutoPayment() external;
}
