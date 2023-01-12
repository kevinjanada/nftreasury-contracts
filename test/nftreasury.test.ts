import { expect } from "chai";
import { ethers } from "ethers";
import hre from "hardhat";
import { NFTreasuryMarketplace, NFTreasury } from "../typechain-types";
import * as MarketplaceJson from "../artifacts/contracts/NFTreasuryMarketplace.sol/NFTreasuryMarketplace.json";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("NFTreasury", async () => {
  const NAME = 'NFTreasury';
  const SYMBOL = 'NFTR';
  let nftContract: NFTreasury;
  let marketplaceContract: NFTreasuryMarketplace;
  let contractOwner: SignerWithAddress;
  let nftMinter: SignerWithAddress;
  let nftBuyer: SignerWithAddress;
  let nftReceiver: SignerWithAddress;
  let someAddress: SignerWithAddress;
  let listingId: number;

  const MAX_UINT_128 = "170141183460469231731687303715884105727";
  const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

  const NFT_PRICE = ethers.utils.parseEther("0.001");
  const LIST_PRICE_BPS_INCREASE = 1000;
  const MAX_BPS = 10000;

  const NFT_PRICE_2 = NFT_PRICE.add(
    NFT_PRICE.mul(LIST_PRICE_BPS_INCREASE).div(MAX_BPS)
  )
  const NFT_PRICE_3 = NFT_PRICE_2.add(
    NFT_PRICE_2.mul(LIST_PRICE_BPS_INCREASE).div(MAX_BPS)
  )

  before(async () => {
    [
      contractOwner,
      nftMinter,
      nftBuyer,
      nftReceiver,
      someAddress
    ] = await hre.ethers.getSigners();

    const MarketplaceFactory = await hre.ethers.getContractFactory("NFTreasuryMarketplace");
    marketplaceContract = await MarketplaceFactory.deploy(
      ethers.constants.AddressZero,
      contractOwner.address, // _defaultAdmin
      "ipfs://Qmaioe7r9YdEUvCRtNBdjqN53SgXJLfRfecV97oWVqEwj6/0", // _contractURI
      [], // _trustedForwarders
      contractOwner.address, // _platformFeeRecipient
      0, // _platformFeeBps
      LIST_PRICE_BPS_INCREASE
    )

    const Nft = await hre.ethers.getContractFactory("NFTreasury");
    nftContract = await Nft.deploy(
      NAME,
      SYMBOL,
      contractOwner.address,
      0,
      contractOwner.address,
      marketplaceContract.address
    ) as NFTreasury;

    /**
     * Deployment for Upgradable contract
     * https://docs.openzeppelin.com/upgrades-plugins/1.x/hardhat-upgrades
     */
    // marketplaceContract = await hre.upgrades.deployProxy(MarketplaceFactory,  [
    //   contractOwner.address, // _defaultAdmin
    //   "ipfs://Qmaioe7r9YdEUvCRtNBdjqN53SgXJLfRfecV97oWVqEwj6/0", // _contractURI
    //   [], // _trustedForwarders
    //   contractOwner.address, // _platformFeeRecipient
    //   0, // _platformFeeBps
    //   LIST_PRICE_BPS_INCREASE
    // ], { 
    //   unsafeAllow: ["constructor", "delegatecall", "state-variable-immutable"],
    //   constructorArgs: [ethers.constants.AddressZero]
    // }) as Marketplace;
    // await marketplaceContract.deployed();

    // set allowed marketplace to NFT contract
    // let tx = await nftContract.setApprovedMarketplace(marketplaceContract.address, true);
    // await tx.wait();

    const tx = await marketplaceContract.setMainNFT(nftContract.address);
    await tx.wait();

    /**
     * Can be used for upgradeable contracts. refer to: https://blog.thirdweb.com/guides/how-to-upgrade-smart-contracts-upgradeable-smart-contracts/
     * Currently the marketplace contract is too big to be upgradeable.
     * Need more refactor to make contract size smaller.
     * Probably need to split functionalities to multiple contracts
     */
    // @ts-ignore
    // const encoded = marketplaceContract.interface.encodeFunctionData("initialize", [
    //   contractOwner.address, // _defaultAdmin
    //   "ipfs://Qmaioe7r9YdEUvCRtNBdjqN53SgXJLfRfecV97oWVqEwj6/0", // _contractURI
    //   [], // _trustedForwarders
    //   contractOwner.address, // _platformFeeRecipient
    //   0, // _platformFeeBps
    //   LIST_PRICE_BPS_INCREASE
    // ])
  })

  it("deploys correctly", async () => {
    expect(nftContract.address).to.not.be.undefined;
    expect(marketplaceContract.address).to.not.be.undefined;
  })

  it("can mint token using lazy mint", async () => {
    // let tx = await nftContract.mintTo(nftMinter.address, 1);
    // await tx.wait();
    // const owner = await nftContract.ownerOf(0);
    // expect(owner).to.equal(nftMinter.address);

    let tx = await nftContract.lazyMint(1, "ipfs://base_uri", []);
    await tx.wait();

    tx = await nftContract.setClaimConditions({
        currency: NATIVE_TOKEN,
        maxClaimableSupply: ethers.constants.MaxUint256,
        supplyClaimed: 0,
        quantityLimitPerWallet: ethers.constants.MaxUint256,
        merkleRoot: ethers.constants.HashZero,
        pricePerToken: 0,
        startTimestamp: Math.floor(Date.now() / 1000),
        metadata: "",
      },
      false,
    )
    await tx.wait();

    await expect(nftContract.connect(nftMinter).claimAndList(
      nftMinter.address,
      NATIVE_TOKEN,
      0,
      {
        proof: [],
        quantityLimitPerWallet: 0,
        pricePerToken: 0,
        currency: NATIVE_TOKEN
      },
      NFT_PRICE,
      []
    )).to.be.revertedWith("Not authorized");

    tx = await nftContract.claimAndList(
      nftMinter.address,
      NATIVE_TOKEN,
      0,
      {
        proof: [],
        quantityLimitPerWallet: 0,
        pricePerToken: 0,
        currency: NATIVE_TOKEN
      },
      NFT_PRICE,
      []
    );
    await tx.wait();

    listingId = 0;

    const owner = await nftContract.ownerOf(0);
    expect(owner).to.equal(nftMinter.address);
  })

  // it("can create listing without approval", async () => {
  //   let tx = await marketplaceContract.connect(nftMinter).createListing({
  //     assetContract: nftContract.address,
  //     buyoutPricePerToken: NFT_PRICE,
  //     currencyToAccept: NATIVE_TOKEN,
  //     listingType: 0,
  //     quantityToList: 1,
  //     reservePricePerToken: 0,
  //     secondsUntilEndTime: 60 * 1, // 1 minute
  //     startTime: Math.floor(Date.now() / 1000), // Now epoch
  //     tokenId: 0,
  //   })

  //   const receipt = await tx.wait();
  //   const eventListingAdded = receipt.events?.find(({ event }) => event == 'ListingAdded');
  //   listingId = eventListingAdded?.args?.listingId.toNumber();
  // });

  it("Listing Purchase: 1. Keep Listing, 2. changes the ownership and lister to the buyer, 3. increase price by BPS_INCREASE", async () => {
    // Buy the NFT
    let tx = await marketplaceContract.connect(nftBuyer).buy(
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
      NFT_PRICE_2,
      "FAIL: Listing price not increased by BPS_INCREASE"
    );
  });

  it("Listing works even after the NFT is transferred to another user", async () => {
    let tx = await nftContract.connect(nftBuyer).transferFrom(
      nftBuyer.address,
      nftReceiver.address,
      0
    );
    await tx.wait();

    let ownerAddress = await nftContract.ownerOf(0);
    expect(ownerAddress).to.equal(nftReceiver.address);

    tx = await marketplaceContract.connect(nftBuyer).buy(
      listingId,
      nftBuyer.address,
      1,
      NATIVE_TOKEN,
      NFT_PRICE_2,
      { value: NFT_PRICE_2 }
    );
    await tx.wait();

    // Expect the ownership of the nft changes to nftBuyer.address
    ownerAddress = await nftContract.ownerOf(0);
    expect(ownerAddress).to.equal(nftBuyer.address, "FAIL: NFT Ownership not transferred to buyer");

    const listing = await marketplaceContract.listings(listingId);
    // Expect listing quantity to not change
    expect(listing.quantity).to.equal(1, "FAIL: Listing quantity should be equal to the original listing");
    // Expect the listing to still exists, and token owner is the previous buyer
    expect(listing.tokenOwner).to.equal(nftBuyer.address, "FAIL: Listing exists and but lister is still the old lister");

    // Expect the price to be higher by LIST_PRICE_BPS_INCREASE
    expect(listing.buyoutPricePerToken).to.equal(
      NFT_PRICE_3,
      "FAIL: Listing price not increased by BPS_INCREASE"
    );
  })

  it("Cannot createListing if OUTSIDE_LISTING_ALLOWED == false", async () => {
    const isAllowed = await marketplaceContract.OUTSIDE_LISTING_ALLOWED();
    expect(isAllowed).to.be.false;

    const listingArgs = {
      assetContract: nftContract.address,
      tokenId: 0,
      listingType: 0,
      buyoutPricePerToken: hre.ethers.constants.MaxUint256,
      reservePricePerToken: ethers.utils.parseEther("0.001"),
      quantityToList: 1,
      currencyToAccept: NATIVE_TOKEN,
      secondsUntilEndTime: 1000,
      startTime: Math.floor(Date.now() / 1000),
    }

    await expect(marketplaceContract.connect(nftBuyer).createListing(listingArgs, nftBuyer.address)).to.be.revertedWith("outside listing is not allowed");

    let tx = await marketplaceContract.setOutsideListingAllowed(true);
    await tx.wait();

    await expect(marketplaceContract.connect(nftBuyer).setOutsideListingAllowed(false))
      .to.be.revertedWith(`AccessControl: account ${nftBuyer.address.toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`);

    tx = await marketplaceContract.connect(nftBuyer).createListing(listingArgs, nftBuyer.address)
    await tx.wait();
  })

  it("Auction is disabled at first, and can be enabled by admin", async () => {
    let isAuctionEnabled = await marketplaceContract.AUCTION_ENABLED();
    expect(isAuctionEnabled).to.be.false;

    const listingArgs = {
      assetContract: nftContract.address,
      tokenId: 0,
      listingType: 1, // ListingType.Auction
      buyoutPricePerToken: hre.ethers.constants.MaxUint256,
      reservePricePerToken: ethers.utils.parseEther("0.001"),
      quantityToList: 1,
      currencyToAccept: NATIVE_TOKEN,
      secondsUntilEndTime: 1000,
      startTime: Math.floor(Date.now() / 1000),
    }

    await expect(marketplaceContract.connect(nftBuyer).createListing(listingArgs, nftBuyer.address)).to.be.revertedWith("auction is not enabled");

    let tx = await marketplaceContract.setAuctionEnabled(true);
    await tx.wait();

    await expect(marketplaceContract.connect(nftBuyer).setAuctionEnabled(false))
      .to.be.revertedWith(`AccessControl: account ${nftBuyer.address.toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`);

    isAuctionEnabled = await marketplaceContract.AUCTION_ENABLED();
    expect(isAuctionEnabled).to.be.true;

    tx = await marketplaceContract.connect(nftBuyer).createListing(listingArgs, nftBuyer.address)
    await tx.wait();
  })

  it("Can only be approved to approvedMarketplaces", async () => {
    await expect(nftContract.approve(someAddress.address, 0)).to.be.revertedWith("can only be approved to approved marketplaces");
    await expect(nftContract.setApprovalForAll(someAddress.address, true)).to.be.revertedWith("can only be approved to approved marketplaces");
  })
});