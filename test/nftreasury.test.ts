import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "ethers";
import hre from "hardhat";
import { Marketplace, NFTreasury } from "../typechain-types";
import * as MarketplaceJson from "../artifacts/contracts/NFTreasuryMarketplace.sol/NFTreasuryMarketplace.json";

describe("NFTreasury", async () => {
  const NAME = 'NFTreasury';
  const SYMBOL = 'NFTR';
  let nftContract: NFTreasury;
  let marketplaceContract: Marketplace;
  let contractOwner: SignerWithAddress;
  let nftMinter: SignerWithAddress;
  let nftBuyer: SignerWithAddress;
  let listingId: number;

  const MAX_UINT_128 = "170141183460469231731687303715884105727";
  const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

  const NFT_PRICE = ethers.utils.parseEther("0.001");
  const LIST_PRICE_BPS_INCREASE = 1000;
  const MAX_BPS = 10000;

  before(async () => {
    [
      contractOwner,
      nftMinter,
      nftBuyer,
    ] = await hre.ethers.getSigners();

    const Nft = await hre.ethers.getContractFactory("NFTreasury");
    nftContract = await Nft.deploy(
      NAME,
      SYMBOL,
      contractOwner.address,
      0,
      contractOwner.address,
    ) as NFTreasury;

    // https://docs.openzeppelin.com/upgrades-plugins/1.x/hardhat-upgrades
    // const Marketplace = await hre.ethers.getContractFactory(abi, bytecode, contractOwner);
    const MarketplaceFactory = await hre.ethers.getContractFactory("NFTreasuryMarketplace");
    marketplaceContract = await hre.upgrades.deployProxy(MarketplaceFactory,  [
      contractOwner.address, // _defaultAdmin
      "ipfs://Qmaioe7r9YdEUvCRtNBdjqN53SgXJLfRfecV97oWVqEwj6/0", // _contractURI
      [], // _trustedForwarders
      contractOwner.address, // _platformFeeRecipient
      0, // _platformFeeBps
      LIST_PRICE_BPS_INCREASE
    ], { 
      unsafeAllow: ["constructor", "delegatecall", "state-variable-immutable"],
      constructorArgs: [ethers.constants.AddressZero]
    }) as Marketplace;
    await marketplaceContract.deployed();

    // set allowed marketplace to NFT contract
    const tx = await nftContract.setApprovedMarketplace(marketplaceContract.address, true);
    await tx.wait();

    /**
     * Can be used for upgradeable contracts.
     * Currently the marketplace contract is too big to be upgradeable.
     * Need more refactor to make contract size smaller.
     * Probably need to split functionalities to multiple contracts
     */
    // @ts-ignore
    const encoded = marketplaceContract.interface.encodeFunctionData("initialize", [
      contractOwner.address, // _defaultAdmin
      "ipfs://Qmaioe7r9YdEUvCRtNBdjqN53SgXJLfRfecV97oWVqEwj6/0", // _contractURI
      [], // _trustedForwarders
      contractOwner.address, // _platformFeeRecipient
      0, // _platformFeeBps
      LIST_PRICE_BPS_INCREASE
    ])
  })

  it("deploys correctly", async () => {
    expect(nftContract.address).to.not.be.undefined;
    expect(marketplaceContract.address).to.not.be.undefined;
  })

  it("can mint token", async () => {
    let tx = await nftContract.mintTo(nftMinter.address, 1);
    await tx.wait();
    const owner = await nftContract.ownerOf(0);
    expect(owner).to.equal(nftMinter.address);
  })

  it("can create listing without approval", async () => {
    let tx = await marketplaceContract.connect(nftMinter).createListing({
      assetContract: nftContract.address,
      buyoutPricePerToken: NFT_PRICE,
      currencyToAccept: NATIVE_TOKEN,
      listingType: 0,
      quantityToList: 1,
      reservePricePerToken: 0,
      secondsUntilEndTime: 60 * 1, // 1 minute
      startTime: Math.floor(Date.now() / 1000), // Now epoch
      tokenId: 0,
    })

    const receipt = await tx.wait();
    const eventListingAdded = receipt.events?.find(({ event }) => event == 'ListingAdded');
    listingId = eventListingAdded?.args?.listingId.toNumber();
  });

  it("Listing Purchase: 1. Keep Listing, 2. changes the ownership and lister to the buyer, 3. increase price by BPS_INCREASE", async () => {
    // Buy the NFT
    let tx = await marketplaceContract.buy(
      listingId,
      nftBuyer.address,
      1,
      NATIVE_TOKEN,
      NFT_PRICE,
      { value: NFT_PRICE }
    );
    await tx.wait();

    // Expect the ownership of the nft changes to nftBuyer.address
    const ownerAddress = await nftContract.ownerOf(0);
    expect(ownerAddress).to.equal(nftBuyer.address, "FAIL: NFT Ownership not transferred to buyer");

    const listing = await marketplaceContract.listings(listingId);
    // Expect listing quantity to not change
    expect(listing.quantity).to.equal(1, "FAIL: Listing quantity should be equal to the original listing");
    // Expect the listing to still exists, and token owner is the previous buyer
    expect(listing.tokenOwner).to.equal(nftBuyer.address, "FAIL: Listing exists and but lister is still the old lister");

    // Expect the price to be higher by LIST_PRICE_BPS_INCREASE
    expect(listing.buyoutPricePerToken).to.equal(
      NFT_PRICE.add(
        NFT_PRICE.mul(LIST_PRICE_BPS_INCREASE).div(MAX_BPS)
      ),
      "FAIL: Listing price not increased by BPS_INCREASE"
    );
  });
});