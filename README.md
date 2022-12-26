## Deployment Steps
1. Deploy NFTreasuryMarketplace
```javascript
# Params
_nativeTokenWrapper*
address: "0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa"
_defaultAdmin*
address: 0x795aE9223FBb6a12a6c71391755Be1707E52EB72
_contractURI*
string: "ipfs://QmfUJNmtB5Liq5uAh5pu4Ghq6BYsAXyGAnemzz5be2sRQG/0"
_trustedForwarders*
address[]: []
_platformFeeRecipient*
address: "0x795aE9223FBb6a12a6c71391755Be1707E52EB72"
_platformFeeBps*
uint256: 250
_listPriceBpsIncrease*
uint64: 1000
```
2. Deploy NFTreasury
  - Set Claim Conditions

3. setMainNFT(nft contract address) @ marketplace contract

## Deployed Contracts
| Name                  | Address                                    | Notes                |
| ----                  | -------                                    | -----                |
| NFTreasuryMarketplace | 0xf0d4F72fb649Dd2d7a76743F82ab4365B07f8305 | Marketplace (Custom) |
| NFTreasury            | 0xaE983F165dC5aaD40B5ee4B0311Ae455e139f43c | NFT (ERC721)         |


## claimAndList
```javascript
_receiver = "Receiving User's wallet address"
_currency = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
_pricePerToken = 0
_allowlistProof =
  {
    "proof": [],
    "quantityLimitPerWallet": 0,
    "pricePerToken": 0,
    "currency": "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"
  }
_listingPrice = x in wei
_data = []
Native Token Value = 0
```

## Getting Started

Create a project using this example:

```bash
npx thirdweb create --contract --template hardhat-javascript-starter
```

You can start editing the page by modifying `contracts/Contract.sol`.

To add functionality to your contracts, you can use the `@thirdweb-dev/contracts` package which provides base contracts and extensions to inherit. The package is already installed with this project. Head to our [Contracts Extensions Docs](https://portal.thirdweb.com/contractkit) to learn more.

## Building the project

After any changes to the contract, run:

```bash
npm run build
# or
yarn build
```

to compile your contracts. This will also detect the [Contracts Extensions Docs](https://portal.thirdweb.com/contractkit) detected on your contract.

## Deploying Contracts

When you're ready to deploy your contracts, just run one of the following command to deploy you're contracts:

```bash
npm run deploy
# or
yarn deploy
```

## Releasing Contracts

If you want to release a version of your contracts publicly, you can use one of the followings command:

```bash
npm run release
# or
yarn release
```

## Join our Discord!

For any questions, suggestions, join our discord at [https://discord.gg/thirdweb](https://discord.gg/thirdweb).
