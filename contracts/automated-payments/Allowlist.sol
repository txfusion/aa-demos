// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract Allowlist {
  /// @dev payee address => allowed bool
  mapping(address => bool) private allowedPayees;

  modifier onlyAllowlisted() {
    require(
      allowedPayees[msg.sender],
      "Only allowlisted payees can trigger auto-payment"
    );
    // Continue execution if called from the allowlisted payee.
    _;
  }

  function isAllowedPayee(address payee) public view returns (bool) {
    return allowedPayees[payee];
  }

  function _addAllowedPayee(address payee) internal {
    allowedPayees[payee] = true;
  }

  function _removeAllowedPayee(address payee) internal {
    allowedPayees[payee] = false;
  }
}
