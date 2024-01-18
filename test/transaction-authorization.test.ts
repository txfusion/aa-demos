import { assert, expect } from "chai";
import * as hre from "hardhat";

import { transactionAuthorizationSetup as txAuthSetup } from "./utils/setups";
import { EIP3009_ERRORS, EIP3009_TYPEHASHES } from "./utils/constants";
import { ecSign, Signature, strip0x } from "./utils/signatures/helpers";
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

    // Note: updated in contract, might make sense to be able to queue transfers beforehand
    // it("should revert if 'validAfter' timestamp has not come yet", async () => {
    //   const { contract, domainSeparator, accounts, erc20 } = context;
    //   const { sender, receiver } = accounts;

    //   const transferParams = {
    //     from: sender.address,
    //     to: receiver.address,
    //     value: 100,
    //     validAfter: ethers.constants.MaxUint256.toString(), // start time long after current time
    //     validBefore: ethers.constants.MaxUint256.toString(),
    //   };
    //   const { from, to, value, validAfter, validBefore } = transferParams;

    //   const { v, r, s } = signQueueTransfer(
    //     from,
    //     to,
    //     value,
    //     validAfter,
    //     validBefore,
    //     nonce,
    //     domainSeparator,
    //     sender.privateKey,
    //   );

    //   expect(await contract.authorizationState(from, to, nonce)).to.be.false;
    //   expect(await contract.balanceOf(from)).to.equal(erc20.supply);

    //   await expect(
    //     contract
    //       .connect(sender)
    //       .queueTransfer(
    //         from,
    //         to,
    //         value,
    //         validAfter,
    //         validBefore,
    //         nonce,
    //         v,
    //         r,
    //         s,
    //       ),
    //   ).to.be.revertedWith(EIP3009_ERRORS.AUTHORIZATION_NOT_YET_VALID);
    // });

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

    // it("should revert if 'validBefore' has expired", async () => {
    //   const { contract, domainSeparator, accounts, erc20 } = context;
    //   const { sender, receiver } = accounts;

    //   const blockNum = await hre.ethers.provider.getBlockNumber();
    //   const block = await hre.ethers.provider.getBlock(blockNum);

    //   const transferParams = {
    //     from: sender.address,
    //     to: receiver.address,
    //     value: 100,
    //     validAfter: 0,
    //     validBefore: block.timestamp + 60 * 1000, // valid for 1 more minute
    //   };
    //   const { from, to, value, validAfter, validBefore } = transferParams;

    //   expect(await contract.authorizationState(from, to, nonce)).to.be.false;
    //   expect(await contract.balanceOf(from)).to.equal(erc20.supply);

    //   await executeQueueTransfer(
    //     contract,
    //     from,
    //     to,
    //     value,
    //     validAfter,
    //     validBefore,
    //     nonce,
    //     domainSeparator,
    //     sender,
    //   );

    //   expect(await contract.balanceOf(contract.address)).to.equal(value);

    //   // increase block.timestamp
    //   await hre.network.provider.send("evm_setNextBlockTimestamp", [
    //     block.timestamp + 2 * 60 * 60 * 1000, // 2 hours later
    //   ]);
    //   // await hre.network.provider.send("evm_mine"); // mine new block

    //   // after this, even though the timestamp is updated and
    //   // the ```require(block.timestamp < validBefore)``` is not satisfied, acceptTransferWithAuthorization goes through

    //   const { v, r, s } = signAcceptTransfer(
    //     from,
    //     to,
    //     value,
    //     validAfter,
    //     validBefore,
    //     nonce,
    //     domainSeparator,
    //     receiver.privateKey,
    //   );

    //   await expect(
    //     contract
    //       .connect(sender)
    //       .acceptTransferWithAuthorization(
    //         sender.address,
    //         receiver.address,
    //         nonce,
    //         v,
    //         r,
    //         s,
    //       ),
    //   ).to.be.revertedWith(EIP3009_ERRORS.AUTHORIZATION_EXPIRED);
    // });

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
          .rejectTransferWithAuthorization(
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

  describe("~~~ Redeem Transfer ~~~", async function () {
    it("should revert if 'msg.sender' is not the receiver", async () => {
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
        receiver.privateKey,
      );

      expect(await contract.authorizationState(from, to, nonce)).to.be.false;
      expect(await contract.balanceOf(from)).to.equal(erc20.supply);
      expect(await contract.balanceOf(to)).to.equal(0);

      await expect(
        contract
          .connect(sender)
          .redeemWithAuthorization(
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
      ).to.be.revertedWith(EIP3009_ERRORS.CALLER_NOT_PAYEE);
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
          .connect(receiver)
          .redeemWithAuthorization(
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
          .connect(receiver)
          .redeemWithAuthorization(
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
          .redeemWithAuthorization(
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

    it("should pass if everything is fine (transfer queued)", async () => {
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
      expect(await contract.balanceOf(from)).to.equal(
        erc20.supply.sub(ethers.BigNumber.from(value)),
      );
      expect(await contract.balanceOf(to)).to.equal(0);

      const { v, r, s } = signReceiveTransfer(
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
        domainSeparator,
        sender.privateKey,
      );

      const redeemTx = await contract
        .connect(receiver)
        .redeemWithAuthorization(
          from,
          to,
          value,
          validAfter,
          validBefore,
          nonce,
          v,
          r,
          s,
        );

      expect(redeemTx)
        .to.emit("TransferRedeemed")
        .withArgs(from, to, nonce, value)
        .to.emit("Transfer")
        .withArgs(contract.address, to, value);

      await redeemTx.wait();

      expect(await contract.balanceOf(contract.address)).to.equal(0);
      expect(await contract.balanceOf(from)).to.equal(
        erc20.supply.sub(ethers.BigNumber.from(value)),
      );
      expect(await contract.balanceOf(to)).to.equal(value);
    });

    it("should pass if everything is fine (transfer NOT queued)", async () => {
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
      expect(await contract.balanceOf(contract.address)).to.equal(0);
      expect(await contract.balanceOf(from)).to.equal(erc20.supply);
      expect(await contract.balanceOf(to)).to.equal(0);

      const { v, r, s } = signReceiveTransfer(
        from,
        to,
        value,
        validAfter,
        validBefore,
        nonce,
        domainSeparator,
        sender.privateKey,
      );

      const redeemTx = await contract
        .connect(receiver)
        .redeemWithAuthorization(
          from,
          to,
          value,
          validAfter,
          validBefore,
          nonce,
          v,
          r,
          s,
        );

      expect(redeemTx)
        .to.emit("TransferRedeemed")
        .withArgs(from, to, nonce, value)
        .to.emit("Transfer")
        .withArgs(from, to, value);

      await redeemTx.wait();

      expect(await contract.balanceOf(contract.address)).to.equal(0);
      expect(await contract.balanceOf(from)).to.equal(
        erc20.supply.sub(ethers.BigNumber.from(value)),
      );
      expect(await contract.balanceOf(to)).to.equal(value);
    });
  });

  describe("~~~ Cancel Authorization ~~~", async function () {
    it("should revert if 'nonce' is unknown", async () => {
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

      const { v, r, s } = signCancelAuthorization(
        from,
        to,
        nonce,
        domainSeparator,
        sender.privateKey,
      );

      await expect(
        contract
          .connect(receiver)
          .cancelAuthorization(from, to, nonce, v, r, s),
      ).to.be.revertedWith(EIP3009_ERRORS.AUTHORIZATION_UNKNOWN);
    });

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

      const { v, r, s } = signCancelAuthorization(
        from,
        to,
        nonce,
        domainSeparator,
        receiver.privateKey,
      );

      await expect(
        contract
          .connect(receiver)
          .cancelAuthorization(from, to, nonce, v, r, s),
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
      expect(await contract.balanceOf(to)).to.equal(0);
      expect(await contract.balanceOf(contract.address)).to.equal(0);

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

      expect(await contract.balanceOf(from)).to.equal(
        erc20.supply.sub(ethers.BigNumber.from(value)),
      );
      expect(await contract.balanceOf(to)).to.equal(0);
      expect(await contract.balanceOf(contract.address)).to.equal(value);

      const { v, r, s } = signCancelAuthorization(
        from,
        to,
        nonce,
        domainSeparator,
        sender.privateKey,
      );

      const cancelTx = await contract
        .connect(sender)
        .cancelAuthorization(from, to, nonce, v, r, s);

      expect(cancelTx)
        .to.emit("Transfer")
        .withArgs(contract.address, from, value)
        .to.emit("AuthorizationCanceled")
        .withArgs(from, to, nonce);

      await cancelTx.wait();

      expect(await contract.balanceOf(from)).to.equal(erc20.supply);
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

const eip712SignPayload = {
  domain: {
    name: "Authorisable EIP-3009 Token",
    version: "1",
    chainId: 280, // zkSync Goerli chain id
    verifyingContract: "0x047A0dC319992618Da783Ea43B093c75f8DF440e", // TokenAuthorisable on testnet
  } as const,
  types: {
    // typehash: 0x8790e5bf3b3c010fae87499a3d3ea57990c7a707fbeb33b32dbbdbecc9122fd1
    // bytes32 + ["address", "address", "uint256", "uint256", "uint256", "bytes32"]
    QueueTransfer: [
      { name: "typehash", type: "bytes32" },
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
    // typehash: 0xf691a8b7f38f3158c9f5e0bee86affb282a4efe5bcd68b44997eb178b661843f
    // bytes32 + ["address", "address", "bytes32"]
    AcceptTransferWithAuthorization: [
      { name: "typehash", type: "bytes32" },
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "nonce", type: "bytes32" },
    ],
    // typehash: 0xd532993334ae2a721b8a5502725ae8ca63faf3200d09cd410b161542e7a8b3e0
    // bytes32 + ["address", "address", "bytes32"]
    RejectTransferWithAuthorization: [
      { name: "typehash", type: "bytes32" },
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "nonce", type: "bytes32" },
    ],
    // NOTE: In contract it's stil called RECEIVE_WITH_AUTHORIZATION_TYPEHASH
    // Won't have any effect on execution, since we are signing it like that, but just keep note to redeploy it later with
    // REDEEM_WITH_AUTHORIZATION_TYPEHASH name (and appropriate keccak256 string), which is correct
    // typehash: 0xd099cc98ef71107a616c4f0f941f04c322d8e254fe26b3c6668db87aae413de8
    // bytes32 + ["address", "address", "uint256", "uint256", "uint256", "bytes32"]
    RedeemWithAuthorization: [
      { name: "typehash", type: "bytes32" },
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
    // typehash: 0x67b7fcdd5efc94e90823a7fd29865d260c4485f2f999c20ffde06b78ec74ac6e
    // bytes32 + ["address", "address", "bytes32"]
    CancelAuthorization: [
      { name: "typehash", type: "bytes32" },
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "nonce", type: "bytes32" },
    ],
  } as const,
  message: "depens on the call",
  primaryType: "depends on the call",
};
