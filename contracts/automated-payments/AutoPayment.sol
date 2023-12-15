// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {PaymentHelper} from "./PaymentHelper.sol";
import {IDelegableAccount} from "./interfaces/IDelegableAccount.sol";
import {IAutoPayment} from "./interfaces/IAutoPayment.sol";

contract AutoPayment is PaymentHelper, IAutoPayment, IERC165, Ownable {
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

  receive() external payable {}
}
