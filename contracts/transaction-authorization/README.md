# Transaction with Authorizations

## Notes

### [EIP-3009](https://eips.ethereum.org/EIPS/eip-3009)

- Unfortunately still in `Draft` status and no work has been put into it for over 3 years, but there were attempts by the Circle's engineers to make it public in 2020.
- Also, it heavily relies on `ECRecover` to validate signatures, but `ECRecover` is highly discouraged by `zksolc` due to native AA being available, where smart accounts could cause some unintended behaviors in `ECRecover`.
  - `zksolc`'s warning message:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ Warning: It looks like you are using 'ecrecover' to validate a signature of a user account.      │
│ zkSync Era comes with native account abstraction support, therefore it is highly recommended NOT │
│ to rely on the fact that the account has an ECDSA private key attached to it since accounts might│
│ implement other signature schemes.                                                               │
│ Read more about Account Abstraction at https://v2-docs.zksync.io/dev/developer-guides/aa.html    │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

- More links:
  - [EIP-3009 repo](https://github.com/CoinbaseStablecoin/eip-3009) by Coinbase Stablecoin team
  - [PR on Ethereum's Github](https://github.com/ethereum/EIPs/issues/3010)
  - [PR on Openzeppelin's Github](https://github.com/OpenZeppelin/openzeppelin-contracts/issues/2436)
