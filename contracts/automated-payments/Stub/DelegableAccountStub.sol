// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {Account} from "../Account.sol";
import {Allowlist} from "../Allowlist.sol";
import {PaymentInterval} from "../libraries/PaymentHelper.sol";

import {IDelegableAccount} from "../interfaces/IDelegableAccount.sol";
import {IAutoPayment} from "../interfaces/IAutoPayment.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

contract DelegableAccountStub is
  IDelegableAccount,
  IERC165,
  Account,
  Allowlist
{
  /// @param _owner: single signer of this account contract
  constructor(address _owner) Account(_owner) {}

  // ---------------------------------- //
  //             Auto Payment           //
  // ---------------------------------- //

  /// @notice Method for allowing a payee to make auto payments
  /// @param _payee The address of payee
  /// @param _amount The amount of ETH the payee is able to pull from the payer
  /// @param _timeInterval The time interval between two pull payments
  /// @dev Reverts if account is not successfully added as an auto-payment subscriber
  function addAllowedPayee(
    address _payee,
    uint256 _amount,
    PaymentInterval _timeInterval
  ) public onlyOwner {
    // add the payee on this contract
    _addAllowedPayee(_payee, _amount, _timeInterval);

    // make an external function call to add this account as an auto-payment subscriber
    bytes memory data = abi.encodeWithSelector(
      IAutoPayment.addSubscriber.selector,
      _amount,
      _timeInterval
    );

    (bool success, ) = _payee.call(data);
    if (!success) {
      revert FailedAddingSubscriber(_payee);
    }
    emit AllowedPayeeAdded(_payee);
  }

  /// @notice Method for disallowing the payee from making auto payments
  /// @param _payee The address of the payee
  /// @dev Emits the FailedRemovingSubscriber event if account is not successfully removed as an auto-payment subscriber
  function removeAllowedPayee(address _payee) public onlyOwner {
    _removeAllowedPayee(_payee);

    // make an external function call to remove this account as an auto-payment subscriber
    bytes memory data = abi.encodeWithSelector(
      IAutoPayment.removeSubscriber.selector
    );

    (bool success, ) = _payee.call(data);
    if (!success) {
      emit FailedRemovingSubscriber(_payee);
    }
    emit AllowedPayeeRemoved(_payee);
  }

  /// @dev Execute auto-payment transfer to allowlisted receiver
  /// @param _ethAmount Amount of ETH to send
  function executeAutoPayment(
    uint256 _ethAmount
  ) public onlyAllowedAutoPayment(_ethAmount) {
    lastPayment[msg.sender] = block.timestamp;

    (bool success, ) = payable(msg.sender).call{value: _ethAmount}("");
    require(
      success,
      "Failed to execute auto-payment. Account balance might not be enough."
    );
  }

  /// @notice method to prove that this contract inherits IAccount and IDelegableAccount interface
  /// @param interfaceId identifier unique to each interface
  /// @return true if this contract implements the interface defined by `interfaceId`
  /// Details: https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[EIP section]
  /// This function call must use less than 30 000 gas
  function supportsInterface(
    bytes4 interfaceId
  ) public view override(Account, IERC165) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
