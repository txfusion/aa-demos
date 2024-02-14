# Paymaster And Batch Transactions

## Overview

This sub-directory presents a Proof of Concept (PoC) showcasing the implementation of **Paymaster** functionalities and **Batch transactions** on the zkSync network. Explore deployment scripts and detailed flows to understand the capabilities and interactions within the zkSync network for efficient and scalable transactions.

## Paymaster

**Paymasters in zkSync** allow for fee compensation and ERC20 token fee payments, enhancing user experience and flexibility. Users interacting with a paymaster should provide the non-zero paymaster address in their EIP712 transaction.

![Paymaster Flows](./diagrams/paymaster-transaction-flow.png)

#### _Two built-in flow:_

![Paymaster Flows](./diagrams/paymaster-methods.png)

### General Paymaster

#### High-Level Explanation

In the General Paymaster flow, users enjoy a straightforward experience—no need for pre-approvals. By incorporating the paymaster address, users can effortlessly conduct transactions while the paymaster takes care of fee compensation behind the scenes.

### Technical Details

The General Paymaster in zkSync allows for fee compensation without prior user actions. Below is a simplified example of client-side interaction:

    const PAYMASTER_ADDRESS = readEnv("GENERAL_PAYMASTER_CONTRACT");

    const paymasterParams = utils.getPaymasterParams(PAYMASTER_ADDRESS, {
      type: "General",
      innerInput: new Uint8Array(),
    });

    // Adjust the following function call based on your contract and method
    await yourContract.generalFunction(yourArguments, {
      customData: {
        gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
        paymasterParams: paymasterParams,
      },
    });

> Ensure the paymaster maintains sufficient ETH balance to cover
> transaction fees. The example demonstrates interaction with a generic
> contract and function. Refer to the zkSync documentation for
> comprehensive details.

## Approval Paymaster

### High-Level Explanation

The Approval Paymaster in zkSync facilitates user-controlled transactions by requiring token allowances. Users employ this paymaster to define minimum allowances for secure token transfers. The process ensures a secure and standardized interaction with zkSync, enhancing control and flexibility for users.

### Technical Details

The Approval-Based Paymaster in zkSync requires user approval for specific token allowances. Here's a simplified example of client-side interaction:

    const PAYMASTER_ADDRESS = readEnv("APPROVAL_PAYMASTER_CONTRACT");
    const TOKEN_ADDRESS = readEnv("ERC20_TOKEN_CONTRACT");
    const TOKEN_AMOUNT_FOR_ALLOWANCE = 1; // Adjust based on paymaster requirements

    const paymasterParams = utils.getPaymasterParams(PAYMASTER_ADDRESS, {
      type: "ApprovalBased",
      token: TOKEN_ADDRESS,
      minimalAllowance: ethers.BigNumber.from(TOKEN_AMOUNT_FOR_ALLOWANCE),
      innerInput: new Uint8Array(),
    });

    // Adjust the following function call based on your contract and method
    await yourContract.approvalBasedFunction(yourArguments, {
      customData: {
        gasPerPubdata: utils.DEFAULT_GAS_PER_PUBDATA_LIMIT,
        paymasterParams: paymasterParams,
      },
    });

> Ensure the `TOKEN_AMOUNT_FOR_ALLOWANCE` represents the amount of the
> token the paymaster requires for covering transaction fees. Adjust
> accordingly based on the specific paymaster implementation.

> As the Approval-Based Paymaster deals with ERC20 tokens and covers
> transaction fees in ETH, it's crucial for Paymaster admin to monitor
> both token and ETH balances. They must ensure sufficient ETH balance
> to cover fees and may withdraw aggregated ERC20 tokens as needed.

## Multicall

### High-Level Explanation

The Multicall contract in zkSync streamlines transaction efficiency by grouping multiple function calls into a single transaction. This process optimizes gas usage, lowers transaction costs, and simplifies interaction with various contracts or functions in a seamless, atomic manner.

### Technical Details

Multicall functionality in zkSync enables efficient batch transactions, aggregating multiple function calls into a single transaction. This script demonstrates the batch execution of ERC20 token transfers to multiple addresses, optimizing gas usage and enhancing transaction throughput on the zkSync network.

    // Prepare batch function calls to transfer 1 token to each address in WALLETS
    const functionCalls = WALLETS.map((wallet, index) => {
      const callData = erc20.interface.encodeFunctionData("transferFrom", [
        getRichWallet().address,
        wallet.address,
        1,
      ]);
      return {
        target: ERC20_TOKEN_CONTRACT,
        allowFailure: false,
        callData: callData,
      };
    });


    // Approve Multicall contract to spend ERC20 tokens
    await erc20.connect(getRichWallet()).functions.approve(CONTRACT_ADDRESS, WALLETS.length)
    .then((res) => res.wait());

    // Execute the batch transaction
    const res = await  contract.aggregate3(functionCalls).then((res) =>  res.wait());

> This script interacts with the Multicall3 contract to execute batch transactions, transferring 1 ERC20 token to each address in `LOCAL_RICH_WALLETS`. It ensures that the caller's wallet has enough ERC20 tokens and approves the Multicall contract to spend them. The estimated gas fee is calculated, and the batch transaction is executed, followed by displaying updated balances.

## Setup

First install requirements:

    yarn

Now you should compile the contracts:

    yarn hardhat compile

## Deployment Scripts

> Remember that for every script `preferredNetwork` could be on of `zkSyncTestnet`, `zkSyncMainnet`, `dockerizedNode`, `inMemoryNode` as they are configured on `hardhat.config.json`

### Mock Contracts Deployment

##### Greeter Contract:

    yarn hardhat deploy-zksync --script deploy/deploy-greeting.ts --network preferredNetwork

> please put the deployed contract address as `GREETER_CONTRACT` on `.env` file.

##### ERC20 Token Contract

    yarn hardhat deploy-zksync --script deploy/deploy-erc20-token.ts --network preferredNetwork

> please put the deployed contract address as `ERC20_TOKEN_CONTRACT` on `.env` file.

### General Paymaster Deployment

    yarn hardhat deploy-zksync --script deploy/deploy-general-paymaster.ts --network preferredNetwork

> Please put the deployed contract address as `GENERAL_PAYMASTER_CONTRACT` on `.env` file.

> This script also charge the deployed paymaster with ETH so it can be used on transactions to cover transaction fee.

### Approval Paymaster Deployment

    yarn hardhat deploy-zksync --script deploy/deploy-approval-paymaster.ts --network preferredNetwork

> Please put the deployed contract address as `APPROVAL_PAYMASTER_CONTRACT` on `.env` file.

> This script also charge the deployed paymaster with ETH so it can be used on transactions to cover transaction fee, also will minted tokens for the deployer wallet.

### Multicall Deployment

    yarn hardhat deploy-zksync --script deploy/deploy-multicall-3.ts --network preferredNetwork

> please put the deployed contract address as `MULTICALL_3_CONTRACT` on `.env` file.

## Interacting with Contracts

### General Paymaster Interaction Script

You can use General Paymaster already deployed to interact with greeter contract:

    yarn hardhat deploy-zksync --script deploy/use-general-paymaster.ts --network preferredNetwork

### Approval Paymaster Interaction Script

You can use Approval Paymaster already deployed to interact with ERC20Token contract to mint token:

    yarn hardhat deploy-zksync --script deploy/use-approval-paymaster.ts --network preferredNetwork

### Multicall Interaction Script

This will interact with `ERC20Token` contract and transfer token from caller wallet to diffrent wallets in one batch transaction:

    yarn hardhat deploy-zksync --script deploy/use-multicall.ts --network preferredNetwork

This Also will do a batch transaction on `Greeting` contract, but without paying transaction fee using paymaster:

     yarn hardhat deploy-zksync --script deploy/use-multicall-paymaster.ts --network preferredNetwork
