// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {AutoPayment} from "./AutoPayment.sol";
import {IAutoPaymentFactory} from "./interfaces/IAutoPaymentFactory.sol";

contract AutoPaymentFactory is IAutoPaymentFactory {
    address public admin;

    address[] public autoPayments;

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only Admins can call");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

   function createNewAutoPayment() public {
        address autoPayment = address(new AutoPayment());
        autoPayments.push(autoPayment);
        emit AutoPaymentCreated(autoPayment);
    }
} 