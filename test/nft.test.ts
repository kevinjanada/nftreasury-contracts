import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "ethers";
import hre from "hardhat";
import { Marketplace, NFTreasury } from "../typechain-types";

describe("NFTreasury", async () => {
  const NAME = 'NFTreasury';
  const SYMBOL = 'NFTR';
  let nftContract: NFTreasury;
  let marketplaceContract: Marketplace;
  let contractOwner: SignerWithAddress;
  // let nftCreator: SignerWithAddress;
  let nftMinter: SignerWithAddress;
  let chainId: number;

  const MAX_UINT_128 = "170141183460469231731687303715884105727";
  const NATIVE_TOKEN = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

  before(async () => {
    [
      contractOwner,
      // nftCreator,
      nftMinter,
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
      0 // _platformFeeBps
    ], { 
      unsafeAllow: ["constructor", "delegatecall", "state-variable-immutable"],
      constructorArgs: [ethers.constants.AddressZero]
    }) as Marketplace;
    await marketplaceContract.deployed();

    // set allowed marketplace to NFT contract
    const tx = await nftContract.setApprovedMarketplace(marketplaceContract.address, true);
    await tx.wait();
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
    let tx = await marketplaceContract.grantRole(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("LISTER_ROLE")), nftMinter.address);
    await tx.wait();

    tx = await marketplaceContract.connect(nftMinter).createListing({
      assetContract: nftContract.address,
      buyoutPricePerToken: ethers.utils.parseEther("0.0001"),
      currencyToAccept: NATIVE_TOKEN,
      listingType: 0,
      quantityToList: 1,
      reservePricePerToken: 0,
      secondsUntilEndTime: 60 * 1, // 1 minute
      startTime: Math.floor(Date.now() / 1000), // Now epoch
      tokenId: 0,
    })

    await tx.wait();
  })
});