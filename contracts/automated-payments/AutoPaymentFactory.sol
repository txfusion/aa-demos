// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {AutoPayment} from "./AutoPayment.sol";
import {IAutoPaymentFactory} from "./interfaces/IAutoPaymentFactory.sol";

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract AutoPaymentFactory is Initializable, UUPSUpgradeable, OwnableUpgradeable, IAutoPaymentFactory {
    address[] public autoPayments;

    function initialize() external initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
    }

    function _authorizeUpgrade(address) internal override onlyOwner {}

    function createNewAutoPayment() public {
        address autoPayment = address(new AutoPayment());
        autoPayments.push(autoPayment);
        emit AutoPaymentCreated(autoPayment);
    }
}