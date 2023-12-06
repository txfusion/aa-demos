import { assert, expect } from "chai";

import { transactionAuthorizationSetup as txAuthSetup } from "./utils/setups";
import { EIP3009_ERRORS, EIP3009_TYPEHASHES } from "./utils/constants";
import {
  ecSign,
  hexStringFromBuffer,
  Signature,
  strip0x,
} from "./utils/signatures/helpers";
import { ethers } from "ethers";
import { Wallet } from "zksync-web3";

let context: Awaited<ReturnType<typeof txAuthSetup>>;
let nonce: any;

describe("========= EIP3009Authorisable =========", async () => {
  beforeEach(async () => {
    context = await txAuthSetup();
    nonce = ethers.BigNumber.from(ethers.utils.randomBytes(32));
  });

  describe("~~~ Setup ~~~", async function () {
    it("should set up ERC20 variables", async () => {
      const { contract, erc20 } = context;

      assert.equal(
        (await contract.totalSupply()).toString(),
        erc20.supply.toString(),
      );
      expect(await contract.name()).to.equal(erc20.name);
      expect(await contract.version()).to.equal(erc20.version);
      expect(await contract.symbol()).to.equal(erc20.symbol);
      expect(await contract.version()).to.equal(erc20.version);
    });

    it("should set up EIP3009 typehashes", async () => {
      const { contract } = context;

      expect(await contract.RECEIVE_WITH_AUTHORIZATION_TYPEHASH()).to.equal(
        EIP3009_TYPEHASHES.RECEIVE,
      );
      expect(await contract.CANCEL_AUTHORIZATION_TYPEHASH()).to.equal(
        EIP3009_TYPEHASHES.CANCEL_AUTHORIZATION,
      );
      expect(
        await contract.QUEUE_TRANSFER_WITH_AUTHORIZATION_TYPEHASH(),
      ).to.equal(EIP3009_TYPEHASHES.QUEUE_TRANSFER);
      expect(
        await contract.ACCEPT_TRANSFER_WITH_AUTHORIZATION_TYPEHASH(),
      ).to.equal(EIP3009_TYPEHASHES.ACCEPT_TRANSFER);
      expect(
        await contract.REJECT_TRANSFER_WITH_AUTHORIZATION_TYPEHASH(),
      ).to.equal(EIP3009_TYPEHASHES.REJECT_TRANSFER);
    });
  });

  describe("~~~ Queue Transfer ~~~", async function () {
    it("should revert if 'from' is not the signer", async () => {
      const { contract, domainSeparator, accounts, erc20 } = context;
      const { sender, receiver } = accounts;

      const transferParams = {
        from: sender.address,
        to: receiver.address,
        value: 100,
        validAfter: 0,
        validBefore: ethers.constants.MaxUint256.toString(),
      };
      const { from, to, value, validAfter, validBefore } = transferParams;

      const { v, r, s } = signQueueTransfer(
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
        domainSeparator,
        receiver.privateKey, // receiver signs transaction to himself
      );

      expect(await contract.authorizationState(from, to, nonce)).to.be.false;
      expect(await contract.balanceOf(from)).to.equal(erc20.supply);

      await expect(
        contract
          .connect(receiver)
          .queueTransfer(
            from,
            to,
            value,
            validAfter,
            validBefore,
            nonce,
            v,
            r,
            s,
          ),
      ).to.be.revertedWith(EIP3009_ERRORS.INVALID_SIGNATURE);
    });

    it("should revert if 'validAfter' timestamp has not come yet", async () => {
      const { contract, domainSeparator, accounts, erc20 } = context;
      const { sender, receiver } = accounts;

      const transferParams = {
        from: sender.address,
        to: receiver.address,
        value: 100,
        validAfter: ethers.constants.MaxUint256.toString(), // start time long after current time
        validBefore: ethers.constants.MaxUint256.toString(),
      };
      const { from, to, value, validAfter, validBefore } = transferParams;

      const { v, r, s } = signQueueTransfer(
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
        domainSeparator,
        sender.privateKey,
      );

      expect(await contract.authorizationState(from, to, nonce)).to.be.false;
      expect(await contract.balanceOf(from)).to.equal(erc20.supply);

      await expect(
        contract
          .connect(sender)
          .queueTransfer(
            from,
            to,
            value,
            validAfter,
            validBefore,
            nonce,
            v,
            r,
            s,
          ),
      ).to.be.revertedWith(EIP3009_ERRORS.AUTHORIZATION_NOT_YET_VALID);
    });

    it("should revert if 'validBefore' timestamp has already passed", async () => {
      const { contract, domainSeparator, accounts, erc20 } = context;
      const { sender, receiver } = accounts;

      const transferParams = {
        from: sender.address,
        to: receiver.address,
        value: 100,
        validAfter: 0,
        validBefore: 0, // end time long before current time
      };
      const { from, to, value, validAfter, validBefore } = transferParams;

      const { v, r, s } = signQueueTransfer(
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
        domainSeparator,
        sender.privateKey,
      );

      expect(await contract.authorizationState(from, to, nonce)).to.be.false;
      expect(await contract.balanceOf(from)).to.equal(erc20.supply);

      await expect(
        contract
          .connect(sender)
          .queueTransfer(
            from,
            to,
            value,
            validAfter,
            validBefore,
            nonce,
            v,
            r,
            s,
          ),
      ).to.be.revertedWith(EIP3009_ERRORS.AUTHORIZATION_EXPIRED);
    });

    it("should revert if 'nonce' has already been used", async () => {
      const { contract, domainSeparator, accounts, erc20 } = context;
      const { sender, receiver } = accounts;

      const transferParams = {
        from: sender.address,
        to: receiver.address,
        value: 100,
        validAfter: 0,
        validBefore: ethers.constants.MaxUint256.toString(),
      };
      const { from, to, value, validAfter, validBefore } = transferParams;

      expect(await contract.authorizationState(from, to, nonce)).to.be.false;
      expect(await contract.balanceOf(from)).to.equal(erc20.supply);

      await executeQueueTransfer(
        contract,
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
        domainSeparator,
        sender,
      );

      expect(await contract.balanceOf(contract.address)).to.equal(value);

      await executeQueueTransfer(
        contract,
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce, // same nonce again
        domainSeparator,
        sender,
        EIP3009_ERRORS.AUTHORIZATION_USED_ERROR,
      );
    });

    it("should pass if everything is fine", async () => {
      const { contract, domainSeparator, accounts, erc20 } = context;
      const { sender, receiver } = accounts;

      const transferParams = {
        from: sender.address,
        to: receiver.address,
        value: 100,
        validAfter: 0,
        validBefore: ethers.constants.MaxUint256.toString(),
      };
      const { from, to, value, validAfter, validBefore } = transferParams;

      expect(await contract.authorizationState(from, to, nonce)).to.be.false;
      expect(await contract.balanceOf(from)).to.equal(erc20.supply);

      await executeQueueTransfer(
        contract,
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
        domainSeparator,
        sender,
      );

      expect(await contract.balanceOf(contract.address)).to.equal(value);
    });
  });

  describe("~~~ Accept Transfer ~~~", async function () {
    it("should revert if pending transfer for the nonce does not exist", async () => {
      const { contract, accounts, domainSeparator } = context;
      const { sender, receiver } = accounts;

      const randomSignature = signAcceptTransfer(
        sender.address,
        receiver.address,
        0,
        0,
        0,
        nonce,
        domainSeparator,
        sender.privateKey,
      );

      await expect(
        contract.connect(sender).acceptTransferWithAuthorization(
          sender.address,
          receiver.address,
          nonce, // non existing nonce
          randomSignature.v,
          randomSignature.r,
          randomSignature.s,
        ),
      ).to.be.revertedWith(EIP3009_ERRORS.AUTHORIZATION_UNKNOWN);
    });

    it("should revert if 'to' is not the signer", async () => {
      const { contract, domainSeparator, accounts, erc20 } = context;
      const { sender, receiver } = accounts;

      const transferParams = {
        from: sender.address,
        to: receiver.address,
        value: 100,
        validAfter: 0,
        validBefore: ethers.constants.MaxUint256.toString(),
      };
      const { from, to, value, validAfter, validBefore } = transferParams;

      expect(await contract.authorizationState(from, to, nonce)).to.be.false;
      expect(await contract.balanceOf(from)).to.equal(erc20.supply);

      const { v, r, s } = await executeQueueTransfer(
        contract,
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
        domainSeparator,
        sender, // sender signs accept message
      );

      expect(await contract.balanceOf(contract.address)).to.equal(value);

      await expect(
        contract
          .connect(sender)
          .acceptTransferWithAuthorization(
            sender.address,
            receiver.address,
            nonce,
            v,
            r,
            s,
          ),
      ).to.be.revertedWith(EIP3009_ERRORS.INVALID_SIGNATURE);
    });

    it("should pass if everything is fine", async () => {
      const { contract, domainSeparator, accounts, erc20 } = context;
      const { sender, receiver } = accounts;

      const transferParams = {
        from: sender.address,
        to: receiver.address,
        value: 100,
        validAfter: 0,
        validBefore: ethers.constants.MaxUint256.toString(),
      };
      const { from, to, value, validAfter, validBefore } = transferParams;

      expect(await contract.authorizationState(from, to, nonce)).to.be.false;
      expect(await contract.balanceOf(from)).to.equal(erc20.supply);

      // Transfer
      await executeQueueTransfer(
        contract,
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
        domainSeparator,
        sender,
      );

      expect(await contract.balanceOf(contract.address)).to.equal(value);
      expect(await contract.balanceOf(to)).to.equal(0);

      // Accept
      const { v, r, s } = signAcceptTransfer(
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
        domainSeparator,
        receiver.privateKey,
      );

      const acceptTx = await contract
        .connect(sender)
        .acceptTransferWithAuthorization(from, to, nonce, v, r, s);

      expect(acceptTx)
        .to.emit(contract, "TransferAccepted")
        .withArgs(from, to, nonce, value)
        .to.emit(contract, "Transfer")
        .withArgs(contract.address, to, value);

      await acceptTx.wait();

      expect(await contract.balanceOf(to)).to.equal(value);
      expect(await contract.balanceOf(contract.address)).to.equal(0);
    });
  });

  describe("~~~ Reject Transfer ~~~", async function () {
    it("should revert if pending transfer for the nonce does not exist", async () => {
      const { contract, accounts, domainSeparator } = context;
      const { sender, receiver } = accounts;

      const randomSignature = signRejectTransfer(
        sender.address,
        receiver.address,
        nonce,
        domainSeparator,
        sender.privateKey,
      );

      await expect(
        contract.connect(sender).rejectTransferWithAuthorization(
          sender.address,
          receiver.address,
          nonce, // non existing nonce
          randomSignature.v,
          randomSignature.r,
          randomSignature.s,
        ),
      ).to.be.revertedWith(EIP3009_ERRORS.AUTHORIZATION_UNKNOWN);
    });

    it("should revert if 'to' is not the signer", async () => {
      const { contract, domainSeparator, accounts, erc20 } = context;
      const { sender, receiver } = accounts;

      const transferParams = {
        from: sender.address,
        to: receiver.address,
        value: 100,
        validAfter: 0,
        validBefore: ethers.constants.MaxUint256.toString(),
      };
      const { from, to, value, validAfter, validBefore } = transferParams;

      expect(await contract.authorizationState(from, to, nonce)).to.be.false;
      expect(await contract.balanceOf(from)).to.equal(erc20.supply);

      const { v, r, s } = await executeQueueTransfer(
        contract,
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
        domainSeparator,
        sender, // sender signs reject message
      );

      expect(await contract.balanceOf(contract.address)).to.equal(value);

      await expect(
        contract
          .connect(sender)
          .acceptTransferWithAuthorization(
            sender.address,
            receiver.address,
            nonce,
            v,
            r,
            s,
          ),
      ).to.be.revertedWith(EIP3009_ERRORS.INVALID_SIGNATURE);
    });

    it("should pass if everything is fine", async () => {
      const { contract, domainSeparator, accounts, erc20 } = context;
      const { sender, receiver } = accounts;

      const transferParams = {
        from: sender.address,
        to: receiver.address,
        value: 100,
        validAfter: 0,
        validBefore: ethers.constants.MaxUint256.toString(),
      };
      const { from, to, value, validAfter, validBefore } = transferParams;

      expect(await contract.authorizationState(from, to, nonce)).to.be.false;
      expect(await contract.balanceOf(from)).to.equal(erc20.supply);

      // Transfer
      await executeQueueTransfer(
        contract,
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
        domainSeparator,
        sender,
      );

      expect(await contract.balanceOf(contract.address)).to.equal(value);
      expect(await contract.balanceOf(to)).to.equal(0);

      // Reject
      const { v, r, s } = signRejectTransfer(
        from,
        to,
        nonce,
        domainSeparator,
        receiver.privateKey,
      );

      const rejectTx = await contract
        .connect(sender)
        .rejectTransferWithAuthorization(from, to, nonce, v, r, s);

      expect(rejectTx)
        .to.emit(contract, "TransferRejected")
        .withArgs(from, to, nonce, value)
        .to.emit(contract, "Transfer")
        .withArgs(contract.address, from, value);

      await rejectTx.wait();

      expect(await contract.balanceOf(to)).to.equal(0);
      expect(await contract.balanceOf(contract.address)).to.equal(0);
    });
  });
});

function signQueueTransfer(
  from: string,
  to: string,
  value: number | string,
  validAfter: number | string,
  validBefore: number | string,
  nonce: string,
  domainSeparator: string,
  privateKey: string,
): Signature {
  return signEIP712(
    domainSeparator,
    EIP3009_TYPEHASHES.QUEUE_TRANSFER,
    ["address", "address", "uint256", "uint256", "uint256", "bytes32"],
    [from, to, value, validAfter, validBefore, nonce],
    privateKey,
  );
}

/**
 * Utility function to abstract away the successful 'queueTransfer' call.
 */
async function executeQueueTransfer(
  contract: ethers.Contract,
  from: string,
  to: string,
  value: number | string,
  validAfter: number | string,
  validBefore: number | string,
  nonce: string,
  domainSeparator: string,
  signer: Wallet,
  revertMsg?: string | undefined,
): Promise<Signature> {
  const { v, r, s } = signQueueTransfer(
    from,
    to,
    value,
    validAfter,
    validBefore,
    nonce,
    domainSeparator,
    signer.privateKey,
  );

  if (revertMsg) {
    await expect(
      contract
        .connect(signer)
        .queueTransfer(
          from,
          to,
          value,
          validAfter,
          validBefore,
          nonce,
          v,
          r,
          s,
        ),
    ).to.be.revertedWith(revertMsg);
    return { v, r, s };
  }

  await expect(
    contract
      .connect(signer)
      .queueTransfer(from, to, value, validAfter, validBefore, nonce, v, r, s),
  )
    .to.emit(contract, "TransferQueued")
    .withArgs(from, to, nonce, value);
  // .to.emit(contract, "Transfer")
  // .withArgs(from, contract.address, value);

  return { v, r, s };
}

function signAcceptTransfer(
  from: string,
  to: string,
  value: number | string,
  validAfter: number | string,
  validBefore: number | string,
  nonce: string,
  domainSeparator: string,
  privateKey: string,
): Signature {
  return signEIP712(
    domainSeparator,
    EIP3009_TYPEHASHES.ACCEPT_TRANSFER,
    ["address", "address", "uint256", "uint256", "uint256", "bytes32"],
    [from, to, value, validAfter, validBefore, nonce],
    privateKey,
  );
}

function signRejectTransfer(
  from: string,
  to: string,
  nonce: string,
  domainSeparator: string,
  privateKey: string,
): Signature {
  return signEIP712(
    domainSeparator,
    EIP3009_TYPEHASHES.REJECT_TRANSFER,
    ["address", "address", "bytes32"],
    [from, to, nonce],
    privateKey,
  );
}

function signReceiveTransfer(
  from: string,
  to: string,
  value: number | string,
  validAfter: number | string,
  validBefore: number | string,
  nonce: string,
  domainSeparator: string,
  privateKey: string,
): Signature {
  return signEIP712(
    domainSeparator,
    EIP3009_TYPEHASHES.RECEIVE,
    ["address", "address", "uint256", "uint256", "uint256", "bytes32"],
    [from, to, value, validAfter, validBefore, nonce],
    privateKey,
  );
}

function signCancelAuthorization(
  from: string,
  to: string,
  nonce: string,
  domainSeparator: string,
  privateKey: string,
): Signature {
  return signEIP712(
    domainSeparator,
    EIP3009_TYPEHASHES.CANCEL_AUTHORIZATION,
    ["address", "address", "bytes32"],
    [from, to, nonce],
    privateKey,
  );
}

function signEIP712(
  domainSeparator: string,
  typeHash: string,
  types: string[],
  parameters: (string | number)[],
  privateKey: string,
): Signature {
  const digest = ethers.utils.keccak256(
    "0x1901" +
      strip0x(domainSeparator) +
      strip0x(
        ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            ["bytes32", ...types],
            [typeHash, ...parameters],
          ),
        ),
      ),
  );

  return ecSign(digest, privateKey);
}
