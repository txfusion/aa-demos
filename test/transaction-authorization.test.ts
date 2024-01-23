import { assert, expect } from "chai";

import {
  transactionAuthorizationSetup as txAuthSetup,
  EIP3009_ERRORS,
  eip3009SignatureTypes,
  signTypedData,
} from "./utils";
import { BigNumber, ethers, TypedDataDomain } from "ethers";
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
  });

  describe("~~~ Queue Transfer ~~~", async function () {
    it("should revert if 'from' is not the signer", async () => {
      const {
        contract,
        accounts: { sender, receiver },
        eip712: { domain },
        erc20,
      } = context;
      const transferParams = {
        from: sender.address,
        to: receiver.address,
        value: 100,
        validAfter: 0,
        validBefore: ethers.constants.MaxUint256.toString(),
      };
      const { from, to, value, validAfter, validBefore } = transferParams;

      const signature = await signQueueTransfer(
        from,
        to,
        BigNumber.from(value),
        BigNumber.from(validAfter),
        BigNumber.from(validBefore),
        nonce,
        domain,
        receiver, // receiver signs transaction to himself
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
            signature,
          ),
      ).to.be.revertedWith(EIP3009_ERRORS.INVALID_SIGNATURE);
    });

    // Note: updated in contract, might make sense to be able to queue transfers beforehand
    // it("should revert if 'validAfter' timestamp has not come yet", async () => {
    //   const { contract, eip712: { domain }, accounts, erc20 } = context;
    //   const { sender, receiver } = accounts;

    //   const transferParams = {
    //     from: sender.address,
    //     to: receiver.address,
    //     value: 100,
    //     validAfter: ethers.constants.MaxUint256.toString(), // start time long after current time
    //     validBefore: ethers.constants.MaxUint256.toString(),
    //   };
    //   const { from, to, value, validAfter, validBefore } = transferParams;

    //   const signature = await signQueueTransfer(
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
      const {
        contract,
        accounts: { sender, receiver },
        eip712: { domain },
        erc20,
      } = context;

      const transferParams = {
        from: sender.address,
        to: receiver.address,
        value: 100,
        validAfter: 0,
        validBefore: 0, // end time long before current time
      };
      const { from, to, value, validAfter, validBefore } = transferParams;

      const signature = await signQueueTransfer(
        from,
        to,
        BigNumber.from(value),
        BigNumber.from(validAfter),
        BigNumber.from(validBefore),
        nonce,
        domain,
        sender,
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
            signature,
          ),
      ).to.be.revertedWith(EIP3009_ERRORS.AUTHORIZATION_EXPIRED);
    });

    it("should revert if 'nonce' has already been used", async () => {
      const {
        contract,
        accounts: { sender, receiver },
        eip712: { domain },
        erc20,
      } = context;

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
        BigNumber.from(value),
        BigNumber.from(validAfter),
        BigNumber.from(validBefore),
        nonce,
        domain,
        sender,
      );

      expect(await contract.balanceOf(contract.address)).to.equal(value);

      await executeQueueTransfer(
        contract,
        from,
        to,
        BigNumber.from(value),
        BigNumber.from(validAfter),
        BigNumber.from(validBefore),
        nonce, // same nonce again
        domain,
        sender,
        EIP3009_ERRORS.AUTHORIZATION_USED_ERROR,
      );
    });

    it("should pass if everything is fine", async () => {
      const {
        contract,
        eip712: { domain },
        accounts: { sender, receiver },
        erc20,
      } = context;

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
        BigNumber.from(value),
        BigNumber.from(validAfter),
        BigNumber.from(validBefore),
        nonce,
        domain,
        sender,
      );

      expect(await contract.balanceOf(contract.address)).to.equal(value);
    });
  });

  describe("~~~ Accept Transfer ~~~", async function () {
    it("should revert if pending transfer for the nonce does not exist", async () => {
      const {
        contract,
        accounts: { sender, receiver },
        eip712: { domain },
      } = context;

      const randomSignature = await signAcceptTransfer(
        sender.address,
        receiver.address,
        BigNumber.from(0),
        BigNumber.from(0),
        BigNumber.from(0),
        nonce,
        domain,
        sender,
      );

      await expect(
        contract.connect(sender).acceptTransferWithAuthorization(
          sender.address,
          receiver.address,
          nonce, // non existing nonce
          randomSignature,
        ),
      ).to.be.revertedWith(EIP3009_ERRORS.AUTHORIZATION_UNKNOWN);
    });

    // it("should revert if 'validBefore' has expired", async () => {
    //   const { contract, eip712: { domain }, accounts, erc20 } = context;
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

    //   const signature = await signAcceptTransfer(
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
      const {
        contract,
        eip712: { domain },
        accounts: { sender, receiver },
        erc20,
      } = context;

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

      const signature = await executeQueueTransfer(
        contract,
        from,
        to,
        BigNumber.from(value),
        BigNumber.from(validAfter),
        BigNumber.from(validBefore),
        nonce,
        domain,
        sender, // sender signs accept message
      );

      expect(await contract.balanceOf(contract.address)).to.equal(value);

      await expect(
        contract.connect(sender).acceptTransferWithAuthorization(
          sender.address,
          receiver.address,
          nonce,
          signature, // submits wrong signature
        ),
      ).to.be.revertedWith(EIP3009_ERRORS.INVALID_SIGNATURE);
    });

    it("should pass if everything is fine", async () => {
      const {
        contract,
        eip712: { domain },
        accounts: { sender, receiver },
        erc20,
      } = context;

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
        BigNumber.from(value),
        BigNumber.from(validAfter),
        BigNumber.from(validBefore),
        nonce,
        domain,
        sender,
      );

      expect(await contract.balanceOf(contract.address)).to.equal(value);
      expect(await contract.balanceOf(to)).to.equal(0);

      // Accept
      const signature = await signAcceptTransfer(
        from,
        to,
        BigNumber.from(value),
        BigNumber.from(validAfter),
        BigNumber.from(validBefore),
        nonce,
        domain,
        receiver,
      );

      const acceptTx = await contract
        .connect(receiver)
        .acceptTransferWithAuthorization(from, to, nonce, signature);

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
      const {
        contract,
        accounts: { sender, receiver },
        eip712: { domain },
      } = context;

      const randomSignature = await signRejectTransfer(
        sender.address,
        receiver.address,
        nonce,
        domain,
        sender,
      );

      await expect(
        contract.connect(sender).rejectTransferWithAuthorization(
          sender.address,
          receiver.address,
          nonce, // non existing nonce
          randomSignature,
        ),
      ).to.be.revertedWith(EIP3009_ERRORS.AUTHORIZATION_UNKNOWN);
    });

    it("should revert if 'to' is not the signer", async () => {
      const {
        contract,
        eip712: { domain },
        accounts,
        erc20,
      } = context;
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

      const signature = await executeQueueTransfer(
        contract,
        from,
        to,
        BigNumber.from(value),
        BigNumber.from(validAfter),
        BigNumber.from(validBefore),
        nonce,
        domain,
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
            signature,
          ),
      ).to.be.revertedWith(EIP3009_ERRORS.INVALID_SIGNATURE);
    });

    it("should pass if everything is fine", async () => {
      const {
        contract,
        eip712: { domain },
        accounts,
        erc20,
      } = context;
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
        BigNumber.from(value),
        BigNumber.from(validAfter),
        BigNumber.from(validBefore),
        nonce,
        domain,
        sender,
      );

      expect(await contract.balanceOf(contract.address)).to.equal(value);
      expect(await contract.balanceOf(to)).to.equal(0);

      // Reject
      const signature = await signRejectTransfer(
        from,
        to,
        nonce,
        domain,
        receiver,
      );

      const rejectTx = await contract
        .connect(receiver)
        .rejectTransferWithAuthorization(from, to, nonce, signature);

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
      const {
        contract,
        eip712: { domain },
        accounts,
        erc20,
      } = context;
      const { sender, receiver } = accounts;

      const transferParams = {
        from: sender.address,
        to: receiver.address,
        value: 100,
        validAfter: 0,
        validBefore: ethers.constants.MaxUint256.toString(),
      };
      const { from, to, value, validAfter, validBefore } = transferParams;

      const signature = await signQueueTransfer(
        from,
        to,
        BigNumber.from(value),
        BigNumber.from(validAfter),
        BigNumber.from(validBefore),
        nonce,
        domain,
        receiver,
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
            signature,
          ),
      ).to.be.revertedWith(EIP3009_ERRORS.CALLER_NOT_PAYEE);
    });

    it("should revert if 'validAfter' timestamp has not come yet", async () => {
      const {
        contract,
        eip712: { domain },
        accounts,
        erc20,
      } = context;
      const { sender, receiver } = accounts;

      const transferParams = {
        from: sender.address,
        to: receiver.address,
        value: 100,
        validAfter: ethers.constants.MaxUint256.toString(), // start time long after current time
        validBefore: ethers.constants.MaxUint256.toString(),
      };
      const { from, to, value, validAfter, validBefore } = transferParams;

      const signature = await signQueueTransfer(
        from,
        to,
        BigNumber.from(value),
        BigNumber.from(validAfter),
        BigNumber.from(validBefore),
        nonce,
        domain,
        sender,
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
            signature,
          ),
      ).to.be.revertedWith(EIP3009_ERRORS.AUTHORIZATION_NOT_YET_VALID);
    });

    it("should revert if 'validBefore' timestamp has already passed", async () => {
      const {
        contract,
        eip712: { domain },
        accounts,
        erc20,
      } = context;
      const { sender, receiver } = accounts;

      const transferParams = {
        from: sender.address,
        to: receiver.address,
        value: 100,
        validAfter: 0,
        validBefore: 0, // end time long before current time
      };
      const { from, to, value, validAfter, validBefore } = transferParams;

      const signature = await signQueueTransfer(
        from,
        to,
        BigNumber.from(value),
        BigNumber.from(validAfter),
        BigNumber.from(validBefore),
        nonce,
        domain,
        sender,
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
            signature,
          ),
      ).to.be.revertedWith(EIP3009_ERRORS.AUTHORIZATION_EXPIRED);
    });

    it("should revert if 'from' is not the signer", async () => {
      const {
        contract,
        eip712: { domain },
        accounts,
        erc20,
      } = context;
      const { sender, receiver } = accounts;

      const transferParams = {
        from: sender.address,
        to: receiver.address,
        value: 100,
        validAfter: 0,
        validBefore: ethers.constants.MaxUint256.toString(),
      };
      const { from, to, value, validAfter, validBefore } = transferParams;

      const signature = await signQueueTransfer(
        from,
        to,
        BigNumber.from(value),
        BigNumber.from(validAfter),
        BigNumber.from(validBefore),
        nonce,
        domain,
        receiver, // receiver signs transaction to himself
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
            signature,
          ),
      ).to.be.revertedWith(EIP3009_ERRORS.INVALID_SIGNATURE);
    });

    it("should pass if everything is fine (transfer queued)", async () => {
      const {
        contract,
        eip712: { domain },
        accounts,
        erc20,
      } = context;
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
        BigNumber.from(value),
        BigNumber.from(validAfter),
        BigNumber.from(validBefore),
        nonce,
        domain,
        sender,
      );

      expect(await contract.balanceOf(contract.address)).to.equal(value);
      expect(await contract.balanceOf(from)).to.equal(
        erc20.supply.sub(ethers.BigNumber.from(value)),
      );
      expect(await contract.balanceOf(to)).to.equal(0);

      const signature = await signRedeemTransfer(
        from,
        to,
        BigNumber.from(value),
        BigNumber.from(validAfter),
        BigNumber.from(validBefore),
        nonce,
        domain,
        sender,
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
          signature,
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
      const {
        contract,
        eip712: { domain },
        accounts,
        erc20,
      } = context;
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

      const signature = await signRedeemTransfer(
        from,
        to,
        BigNumber.from(value),
        BigNumber.from(validAfter),
        BigNumber.from(validBefore),
        nonce,
        domain,
        sender,
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
          signature,
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
      const {
        contract,
        eip712: { domain },
        accounts,
        erc20,
      } = context;
      const { sender, receiver } = accounts;

      const transferParams = {
        from: sender.address,
        to: receiver.address,
        value: 100,
        validAfter: 0,
        validBefore: ethers.constants.MaxUint256.toString(),
      };
      const { from, to, value, validAfter, validBefore } = transferParams;

      const signature = await signCancelAuthorization(
        from,
        to,
        nonce,
        domain,
        sender,
      );

      await expect(
        contract
          .connect(receiver)
          .cancelAuthorization(from, to, nonce, signature),
      ).to.be.revertedWith(EIP3009_ERRORS.AUTHORIZATION_UNKNOWN);
    });

    it("should revert if 'from' is not the signer", async () => {
      const {
        contract,
        eip712: { domain },
        accounts,
        erc20,
      } = context;
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
        BigNumber.from(value),
        BigNumber.from(validAfter),
        BigNumber.from(validBefore),
        nonce,
        domain,
        sender,
      );

      const signature = await signCancelAuthorization(
        from,
        to,
        nonce,
        domain,
        receiver,
      );

      await expect(
        contract
          .connect(receiver)
          .cancelAuthorization(from, to, nonce, signature),
      ).to.be.revertedWith(EIP3009_ERRORS.INVALID_SIGNATURE);
    });

    it("should pass if everything is fine", async () => {
      const {
        contract,
        eip712: { domain },
        accounts,
        erc20,
      } = context;
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
        BigNumber.from(value),
        BigNumber.from(validAfter),
        BigNumber.from(validBefore),
        nonce,
        domain,
        sender,
      );

      expect(await contract.balanceOf(from)).to.equal(
        erc20.supply.sub(ethers.BigNumber.from(value)),
      );
      expect(await contract.balanceOf(to)).to.equal(0);
      expect(await contract.balanceOf(contract.address)).to.equal(value);

      const signature = await signCancelAuthorization(
        from,
        to,
        nonce,
        domain,
        sender,
      );

      const cancelTx = await contract
        .connect(sender)
        .cancelAuthorization(from, to, nonce, signature);

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
  value: BigNumber,
  validAfter: BigNumber,
  validBefore: BigNumber,
  nonce: string,
  domain: TypedDataDomain,
  signer: Wallet,
): Promise<string> {
  return signTypedData(
    domain,
    eip3009SignatureTypes.queue,
    { from, to, value, validAfter, validBefore, nonce },
    signer,
  );
}

/**
 * Utility function to abstract away the successful 'queueTransfer' call.
 */
async function executeQueueTransfer(
  contract: ethers.Contract,
  from: string,
  to: string,
  value: BigNumber,
  validAfter: BigNumber,
  validBefore: BigNumber,
  nonce: string,
  domain: TypedDataDomain,
  signer: Wallet,
  revertMsg?: string | undefined,
): Promise<string> {
  const signature = signQueueTransfer(
    from,
    to,
    value,
    validAfter,
    validBefore,
    nonce,
    domain,
    signer,
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
          signature,
        ),
    ).to.be.revertedWith(revertMsg);
    return signature;
  }

  await expect(
    contract
      .connect(signer)
      .queueTransfer(
        from,
        to,
        BigNumber.from(value),
        BigNumber.from(validAfter),
        BigNumber.from(validBefore),
        nonce,
        signature,
      ),
  )
    .to.emit(contract, "TransferQueued")
    .withArgs(from, to, nonce, value);
  // .to.emit(contract, "Transfer")
  // .withArgs(from, contract.address, value);

  return signature;
}

function signAcceptTransfer(
  from: string,
  to: string,
  value: BigNumber,
  validAfter: BigNumber,
  validBefore: BigNumber,
  nonce: string,
  domain: TypedDataDomain,
  signer: Wallet,
): Promise<string> {
  return signTypedData(
    domain,
    eip3009SignatureTypes.accept,
    { from, to, value, validAfter, validBefore, nonce },
    signer,
  );
}

function signRejectTransfer(
  from: string,
  to: string,
  nonce: string,
  domain: TypedDataDomain,
  signer: Wallet,
): Promise<string> {
  return signTypedData(
    domain,
    eip3009SignatureTypes.reject,
    { from, to, nonce },
    signer,
  );
}

function signRedeemTransfer(
  from: string,
  to: string,
  value: BigNumber,
  validAfter: BigNumber,
  validBefore: BigNumber,
  nonce: string,
  domain: TypedDataDomain,
  signer: Wallet,
): Promise<string> {
  return signTypedData(
    domain,
    eip3009SignatureTypes.redeem,
    { from, to, value, validAfter, validBefore, nonce },
    signer,
  );
}

function signCancelAuthorization(
  from: string,
  to: string,
  nonce: string,
  domain: TypedDataDomain,
  signer: Wallet,
): Promise<string> {
  return signTypedData(
    domain,
    eip3009SignatureTypes.cancel,
    { from, to, nonce },
    signer,
  );
}

const eip712SignPayload = {
  domain: {
    name: "Authorisable EIP-3009 Token",
    version: "1",
    chainId: 280, // zkSync Goerli chain id
    verifyingContract: "0x047A0dC319992618Da783Ea43B093c75f8DF440e", // TokenAuthorisable on testnet
  } as const,
  types: {
    QueueTransfer: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
    AcceptTransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "nonce", type: "bytes32" },
    ],
    RejectTransferWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "nonce", type: "bytes32" },
    ],
    RedeemWithAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
    ],
    CancelAuthorization: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "nonce", type: "bytes32" },
    ],
  } as const,
  message: "depends on the call",
  primaryType: "depends on the call",
};
