// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

import "./interfaces/IDelegableAccount.sol";

import "./conditions/PaymentCondition.sol";

contract AutoPayment is Ownable {
  // enum SubscriptionType {
  //   DAILY,
  //   WEEKLY,
  //   MONTHLY,
  //   ANNUAL
  // }

  struct Subscription {
    uint256 amount;
    uint256 lastCharged;
    // PaymentCondition[] conditions;
    // SubscriptionType type;
  }

  address[] private subscribers;

  /// @dev subscriber address => subscription Subscription
  mapping(address => Subscription) private subscriptions;

  modifier onlyDelegableAccount(address subscriber) {
    // Check if subscriber implements IDelegableAccount interface
    bytes4 delegableAccountInterfaceId = bytes4(
      keccak256("executeAutoPayment(uint256)")
    );
    require(
      IDelegableAccount(subscriber).supportsInterface(
        delegableAccountInterfaceId
      ),
      "Subscriber does not support IDelegableAccount interface."
    );
    _;
  }

  function executePayments() external onlyOwner {
    for (uint i = 0; i < subscribers.length; i++) {
      IDelegableAccount(subscribers[i]).executeAutoPayment(
        subscriptions[subscribers[i]].amount
      );
      subscriptions[subscribers[i]].lastCharged = block.timestamp;
    }
  }

  function addSubscriber(
    address subscriber,
    uint256 amount
  ) external onlyDelegableAccount(subscriber) {
    // TODO
  }

  function removeSubscriber(
    address subscriber
  ) external onlyDelegableAccount(subscriber) {
    // TODO
  }
}
