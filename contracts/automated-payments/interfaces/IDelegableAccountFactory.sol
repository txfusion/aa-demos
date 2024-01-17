// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

interface IDelegableAccountFactory {
  event DelegableAccountCreated(
    address indexed delegableAccountAddress
  );
  function createNewDelegableAccount(address owner) external;
}
