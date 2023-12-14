// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {PaymentHelper} from "./PaymentHelper.sol";
import {IDelegableAccount} from "./interfaces/IDelegableAccount.sol";
import {IAutoPayment} from "./interfaces/IAutoPayment.sol";

contract AutoPayment is PaymentHelper, IAutoPayment, Ownable {
  /// @dev subscriber => lastTimeCharged
  mapping(address => uint256) lastCharged;

  /// @dev subscriber => subscriptions conditions
  mapping(address => SubscriptionCondition) paymentConditions;

  constructor() Ownable() {}

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
    lastCharged[msg.sender] = block.timestamp;
  }

  function addSubscriber(
    uint256 amount,
    SubscriptionPeriod timeInterval
  ) external onlyDelegableAccount(msg.sender) {
    uint256 paymentDuration = getPaymentDuration(timeInterval);

    paymentConditions[msg.sender] = SubscriptionCondition(
      amount,
      paymentDuration
    );
  }

  function removeSubscriber() external onlyDelegableAccount(msg.sender) {
    delete paymentConditions[msg.sender];
  }

  /// @notice method to prove that this contract inherits IAccount interface, called
  /// @param interfaceId identifier unique to each interface
  /// @return true if this contract implements the interface defined by `interfaceId`
  /// Details: https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[EIP section]
  /// This function call must use less than 30 000 gas
  function supportsInterface(
    bytes4 interfaceId
  ) external pure override returns (bool) {
    return interfaceId == type(IAutoPayment).interfaceId;
  }
}
