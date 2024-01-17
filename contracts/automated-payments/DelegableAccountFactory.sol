// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {DelegableAccount} from "./DelegableAccount.sol";
import {IDelegableAccountFactory} from "./interfaces/IDelegableAccountFactory.sol";

contract DelegableAccountFactory is IDelegableAccountFactory {
    address public admin;

    address[] public delegableAccounts;

    modifier onlyAdmin() {
        require(msg.sender == admin, "Only Admins can call");
        _;
    }

    constructor() {
        admin = msg.sender;
    }

   function createNewDelegableAccount(address owner) public {
        address delegableAccount = address(new DelegableAccount(owner));
        delegableAccounts.push(delegableAccount);
        emit DelegableAccountCreated(delegableAccount);
    }
} 