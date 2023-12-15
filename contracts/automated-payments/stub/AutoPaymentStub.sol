// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {PaymentHelper} from "../PaymentHelper.sol";
import {IDelegableAccount} from "../interfaces/IDelegableAccount.sol";
import {IAutoPayment} from "../interfaces/IAutoPayment.sol";

contract AutoPaymentStub is PaymentHelper, Ownable {
  event SubscriberAdded(
    address indexed _subscriber,
    uint256 indexed _amount,
    uint256 indexed _timeInterval
  );
  event SubscriberRemoved(address indexed _subscriber);

  /// @dev subscriber => block timestamp of the last auto payment
  mapping(address => uint256) public lastCharged;

  /// @dev subscriber => subscriptions conditions
  mapping(address => SubscriptionCondition) paymentConditions;

  constructor() Ownable() {}

  modifier onlyDelegableAccount(address _subscriber) {
    require(
      IERC165(_subscriber).supportsInterface(
        type(IDelegableAccount).interfaceId
      ),
      "Subscriber does not support IDelegableAccount interface."
    );
    _;
  }

  function getPaymentConditions(
    address _payee
  ) public view returns (uint256, uint256) {
    return (
      paymentConditions[_payee].amount,
      paymentConditions[_payee].paymentDuration
    );
  }

  // TODO: CHECK CONDITIONS BEFORE CALLING
  function executePayment(address _subscriber, uint256 _amount) external {
    // lastCharged[_subscriber] = block.timestamp;
    IDelegableAccount(_subscriber).executeAutoPayment(_amount);
  }

  /// @notice The method to add a new auto payments subscriber
  /// @param _amount The max amount of ETH that can be pulled from a subscriber
  /// @param _timeInterval The time interval between two pull payments
  function addSubscriber(
    uint256 _amount,
    PaymentPeriod _timeInterval
  ) external onlyDelegableAccount(msg.sender) {
    uint256 paymentDuration = getPaymentDuration(_timeInterval);

    paymentConditions[msg.sender] = SubscriptionCondition(
      _amount,
      paymentDuration
    );

    emit SubscriberAdded(msg.sender, _amount, paymentDuration);
  }

  /// @notice method only subscriber can call to abort auto payments
  function removeSubscriber() external onlyDelegableAccount(msg.sender) {
    delete paymentConditions[msg.sender];

    emit SubscriberRemoved(msg.sender);
  }

  receive() external payable {}
}
