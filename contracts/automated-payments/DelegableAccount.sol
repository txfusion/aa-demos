// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@matterlabs/zksync-contracts/l2/system-contracts/interfaces/IAccount.sol";

import "@matterlabs/zksync-contracts/l2/system-contracts/libraries/TransactionHelper.sol";
import "@matterlabs/zksync-contracts/l2/system-contracts/Constants.sol";

import "@openzeppelin/contracts/interfaces/IERC1271.sol";

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "./interfaces/IDelegableAccount.sol";
import "./interfaces/IAutoPayment.sol";

import "./Allowlist.sol";
import "./AutoPayment.sol";

contract DelegableAccount is IAccount, IERC165, IERC1271, Ownable, Allowlist {
  using TransactionHelper for Transaction;

  error InvalidPayment();

  // bytes4(keccak256("isValidSignature(bytes32,bytes)")
  bytes4 constant EIP1271_SUCCESS_RETURN_VALUE = 0x1626ba7e;

  /// @dev Simulate the behavior of the EOA if the caller is not the bootloader.
  /// Essentially, for all non-bootloader callers halt the execution with empty return data.
  /// If all functions will use this modifier AND the contract will implement an empty payable fallback()
  /// then the contract will be indistinguishable from the EOA when called.
  modifier ignoreNonBootloader() {
    if (msg.sender != BOOTLOADER_FORMAL_ADDRESS) {
      // If function was called outside of the bootloader, behave like an EOA.
      assembly {
        return(0, 0)
      }
    }
    // Continue execution if called from the bootloader.
    _;
  }

  /// @dev Simulate the behavior of the EOA if it is called via `delegatecall`.
  /// Thus, the default account on a delegate call behaves the same as EOA on Ethereum.
  /// If all functions will use this modifier AND the contract will implement an empty payable fallback()
  /// then the contract will be indistinguishable from the EOA when called.
  modifier ignoreInDelegateCall() {
    address codeAddress = SystemContractHelper.getCodeAddress();
    if (codeAddress != address(this)) {
      // If the function was delegate called, behave like an EOA.
      assembly {
        return(0, 0)
      }
    }
    // Continue execution if not delegate called.
    _;
  }

  /// @param _owner: single signer of this account contract
  constructor(address _owner) {
    _transferOwnership(_owner);
  }

  // ---------------------------------- //
  //             Validation             //
  // ---------------------------------- //

  /// @notice Validates the transaction & increments nonce.
  /// @dev The transaction is considered accepted by the account if
  /// the call to this function by the bootloader does not revert
  /// and the nonce has been set as used.
  /// @param _suggestedSignedHash The suggested hash of the transaction to be signed by the user.
  /// This is the hash that is signed by the EOA by default.
  /// @param _transaction The transaction structure itself.
  /// @dev Besides the params above, it also accepts unused first paramter "_txHash", which
  /// is the unique (canonical) hash of the transaction.
  function validateTransaction(
    bytes32,
    bytes32 _suggestedSignedHash,
    Transaction calldata _transaction
  )
    external
    payable
    override
    ignoreNonBootloader
    ignoreInDelegateCall
    returns (bytes4 magic)
  {
    magic = _validateTransaction(_suggestedSignedHash, _transaction);
  }

  /// @notice Inner method for validating transaction and increasing the nonce
  /// @param _suggestedSignedHash The hash of the transaction signed by the EOA
  /// @param _transaction The transaction.
  /// @return magic The bytes4 value that is ACCOUNT_VALIDATION_SUCCESS_MAGIC if valid
  function _validateTransaction(
    bytes32 _suggestedSignedHash,
    Transaction calldata _transaction
  ) internal returns (bytes4 magic) {
    // Incrementing the nonce of the account.
    SystemContractsCaller.systemCallWithPropagatedRevert(
      uint32(gasleft()),
      address(NONCE_HOLDER_SYSTEM_CONTRACT),
      0,
      abi.encodeCall(
        INonceHolder(NONCE_HOLDER_SYSTEM_CONTRACT).incrementMinNonceIfEquals,
        (_transaction.nonce)
      )
    );

    // While the suggested signed hash is usually provided, it is generally
    // not recommended to rely on it to be present, since in the future
    // there may be tx types with no suggested signed hash.
    bytes32 txHash = _suggestedSignedHash == bytes32(0)
      ? _transaction.encodeHash()
      : _suggestedSignedHash;

    // The fact there is enough balance for the account
    // should be checked explicitly to prevent user paying for fee for a
    // transaction that wouldn't be included on Ethereum.
    require(
      _transaction.totalRequiredBalance() <= address(this).balance,
      "Not enough balance for fee + value"
    );

    if (
      isValidSignature(txHash, _transaction.signature) ==
      EIP1271_SUCCESS_RETURN_VALUE
    ) {
      magic = ACCOUNT_VALIDATION_SUCCESS_MAGIC;
    }
  }

  /// @dev Should return whether the signature provided is valid for the provided data
  /// @param _hash The hash of the transaction to be signed.
  /// @param _signature The signature of the transaction.
  /// @return magic The bytes4 value that is ACCOUNT_VALIDATION_SUCCESS_MAGIC if valid
  function isValidSignature(
    bytes32 _hash,
    bytes memory _signature
  ) public view override returns (bytes4 magic) {
    magic = EIP1271_SUCCESS_RETURN_VALUE;

    if (_signature.length != 65) {
      // Signature is invalid anyway, but we need to proceed with the signature verification as usual
      // in order for the fee estimation to work correctly
      _signature = new bytes(65);

      // Making sure that the signatures look like a valid ECDSA signature and are not rejected rightaway
      // while skipping the main verification process.
      _signature[64] = bytes1(uint8(27));
    }

    bytes memory signature = extractECDSASignature(_signature);

    if (!_checkValidECDSASignatureFormat(signature)) {
      magic = bytes4(0);
    }

    address signer = ECDSA.recover(_hash, signature);

    if (signer != owner()) {
      magic = bytes4(0);
    }
  }

  function extractECDSASignature(
    bytes memory _signature
  ) internal pure returns (bytes memory signature) {
    require(_signature.length == 65, "Invalid length");

    signature = new bytes(65);

    // we jump 32 (0x20) as the first slot of bytes contains the length of the `_signature`
    assembly {
      let r := mload(add(_signature, 0x20))
      let s := mload(add(_signature, 0x40))
      let v := and(mload(add(_signature, 0x41)), 0xff)

      mstore(add(signature, 0x20), r)
      mstore(add(signature, 0x40), s)
      mstore8(add(signature, 0x60), v)
    }
  }

  /// @notice Verifies that the ECDSA signature is both in correct format and non-malleable
  function _checkValidECDSASignatureFormat(
    bytes memory _signature
  ) internal pure returns (bool) {
    if (_signature.length != 65) {
      return false;
    }

    uint8 v;
    bytes32 r;
    bytes32 s;

    // Signature loading code
    // we jump 32 (0x20) as the first slot of bytes contains the length
    // we jump 65 (0x41) per signature
    // for v we load 32 bytes ending with v (the first 31 come from s) then apply a mask
    assembly {
      r := mload(add(_signature, 0x20))
      s := mload(add(_signature, 0x40))
      v := and(mload(add(_signature, 0x41)), 0xff)
    }
    if (v != 27 && v != 28) {
      return false;
    }

    // EIP-2 still allows signature malleability for ecrecover(). Remove this possibility and make the signature
    // unique. Appendix F in the Ethereum Yellow paper (https://ethereum.github.io/yellowpaper/paper.pdf), defines
    // the valid range for s in (301): 0 < s < secp256k1n ÷ 2 + 1, and for v in (302): v ∈ {27, 28}. Most
    // signatures from current libraries generate a unique signature with an s-value in the lower half order.
    //
    // If your library generates malleable signatures, such as s-values in the upper range, calculate a new s-value
    // with 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEBAAEDCE6AF48A03BBFD25E8CD0364141 - s1 and flip v from 27 to 28 or
    // vice versa. If your library also generates signatures with 0/1 for v instead 27/28, add 27 to v to accept
    // these malleable signatures as well.
    if (
      uint256(s) >
      0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0
    ) {
      return false;
    }

    return true;
  }

  // ---------------------------------- //
  //             Executions             //
  // ---------------------------------- //

  /// @notice Method called by the bootloader to execute the transaction.
  /// @param _transaction The transaction to execute.
  /// @dev It also accepts unused _txHash and _suggestedSignedHash parameters:
  /// the unique (canonical) hash of the transaction and the suggested signed
  /// hash of the transaction.
  function executeTransaction(
    bytes32,
    bytes32,
    Transaction calldata _transaction
  ) external payable override ignoreNonBootloader ignoreInDelegateCall {
    _executeTransaction(_transaction);
  }

  function _executeTransaction(Transaction calldata _transaction) internal {
    address to = address(uint160(_transaction.to));
    uint128 value = Utils.safeCastToU128(_transaction.value);
    bytes memory data = _transaction.data;

    if (to == address(DEPLOYER_SYSTEM_CONTRACT)) {
      uint32 gas = Utils.safeCastToU32(gasleft());

      // Note, that the deployer contract can only be called
      // with a "systemCall" flag.
      SystemContractsCaller.systemCallWithPropagatedRevert(
        gas,
        to,
        value,
        data
      );
    } else {
      bool success;
      assembly {
        success := call(gas(), to, value, add(data, 0x20), mload(data), 0, 0)
      }
      require(success);
    }
  }

  function executeTransactionFromOutside(
    Transaction calldata _transaction
  ) external payable {
    _validateTransaction(bytes32(0), _transaction);
    _executeTransaction(_transaction);
  }

  // ---------------------------------- //
  //             Auto Payment           //
  // ---------------------------------- //

  /// @notice Method for allowing a payee to make auto payments
  /// @param _payee The address of payee
  /// @param _amount The amount of ETH the payee is able to pull from the payer
  /// @param _timeInterval The time interval between two pull payments
  /// @dev In case payee contract no longer supports addSubscriber() function,
  /// the payee can be added on this contract only
  function addAllowedPayee(
    address _payee,
    uint256 _amount,
    SubscriptionPeriod _timeInterval
  ) public onlyOwner {
    _addAllowedPayee(_payee, _amount, _timeInterval);

    bytes4 autoPaymentInterfaceId = bytes4(
      keccak256("addSubscriber(uint256,uint8)")
    );

    if (IAutoPayment(_payee).supportsInterface(autoPaymentInterfaceId)) {
      AutoPayment(_payee).addSubscriber(_amount, _timeInterval);
    }
  }

  /// @notice Method for disallowing the payee from making auto payments
  /// @param _payee The address of the payee
  /// @dev In case payee contract no longer supports removeSubscriber() function,
  /// make sure that address of the payee is removed from this contract
  function removeAllowedPayee(address _payee) public onlyOwner {
    _removeAllowedPayee(_payee);

    bytes4 autoPaymentInterfaceId = bytes4(keccak256("removeSubscriber()"));

    if (IAutoPayment(_payee).supportsInterface(autoPaymentInterfaceId)) {
      AutoPayment(_payee).removeSubscriber();
    }
  }

  /// @dev Execute auto-payment transfer to allowlisted receiver
  /// @param _ethAmount Amount of ETH to send
  function executeAutoPayment(uint256 _ethAmount) external onlyAllowlisted {
    bool isPaymentValid = isAutoPaymentAllowed(msg.sender, _ethAmount);

    if (!isPaymentValid) {
      revert InvalidPayment();
    }

    (bool success, ) = payable(msg.sender).call{value: _ethAmount}("");
    require(
      success,
      "Failed to execute auto-payment. Account balance might not be enough."
    );
  }

  // ---------------------------------- //
  //               Others               //
  // ---------------------------------- //

  /// @notice Method for paying the bootloader for the transaction.
  /// @param _transaction The transaction for which the fee is paid.
  /// @dev It also accepts unused _txHash and _suggestedSignedHash parameters:
  /// the unique (canonical) hash of the transaction and the suggested signed
  /// hash of the transaction.
  function payForTransaction(
    bytes32,
    bytes32,
    Transaction calldata _transaction
  ) external payable override ignoreNonBootloader ignoreInDelegateCall {
    bool success = _transaction.payToTheBootloader();
    require(success, "Failed to pay the fee to the operator");
  }

  /// @notice Method, where the user should prepare for the transaction to be
  /// paid for by a paymaster.
  /// @dev Here, the account should set the allowance for the smart contracts
  /// @param _transaction The transaction.
  /// @dev It also accepts unused _txHash and _suggestedSignedHash parameters:
  /// the unique (canonical) hash of the transaction and the suggested signed
  /// hash of the transaction.
  function prepareForPaymaster(
    bytes32, // _txHash
    bytes32, // _suggestedSignedHash
    Transaction calldata _transaction
  ) external payable override ignoreNonBootloader ignoreInDelegateCall {
    _transaction.processPaymasterInput();
  }

  /// @notice method to prove that this contract inherits IAccount and IDelegableAccount interface
  /// @param interfaceId identifier unique to each interface
  /// @return true if this contract implements the interface defined by `interfaceId`
  /// Details: https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[EIP section]
  /// This function call must use less than 30 000 gas
  function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
    return
      interfaceId == type(IAccount).interfaceId ||
      interfaceId == type(IDelegableAccount).interfaceId;
  }

  fallback() external {
    // fallback of default account shouldn't be called by bootloader under no circumstances
    assert(msg.sender != BOOTLOADER_FORMAL_ADDRESS);

    // If the contract is called directly, behave like an EOA
  }

  receive() external payable {
    // If the contract is called directly, behave like an EOA.
    // Note, that is okay if the bootloader sends funds with no calldata as it may be used for refunds/operator payments
  }
}
