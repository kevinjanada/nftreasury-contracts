// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.0;

import "./base/ERC721Drop.sol";
import "@thirdweb-dev/contracts/lib/TWAddress.sol";

import { INFTreasuryMarketplace as IMarketplace } from "./interface/INFTreasuryMarketplace.sol";
import "@thirdweb-dev/contracts/lib/CurrencyTransferLib.sol";

contract NFTreasury is ERC721Drop {
    uint256 public maxSupply;
    uint256 public cost;
    string public baseURI;
    string public baseExtension = ".json";

    bool public revealed = true;

    // 0 for Pause
    // 1 for Public
    bool public pause = true;

    /// @notice emitted when a new marketplace is approved or unapproved
    event MarketplaceApproved(address indexed marketplace, bool approved);

    /// @notice Mapping of approved marketplaces
    mapping(address => bool) public approvedMarketplaces;

    address public mainMarketplace;

    constructor(
        string memory _name,
        string memory _symbol,
        address _royaltyRecipient,
        uint128 _royaltyBps,
        address _primaryRecepient,
        address _mainMarketplace
    )
        ERC721Drop(
            _name,
            _symbol,
            _royaltyRecipient,
            _royaltyBps,
            _primaryRecepient
        )
    {
        mainMarketplace = _mainMarketplace;
        setApprovedMarketplace(_mainMarketplace, true);
    }

    function toggleContractPause() public onlyOwner {
        pause = true;
    }

    function toggleContractStart() public onlyOwner {
        pause = false;
    }

    function setCost(uint256 _price) public onlyOwner {
        cost = _price;
    }

    function setMaxSupply(uint256 _supply) public onlyOwner {
        maxSupply = _supply;
    }

    function setMainMarketplace(address _mainMarketplace) external onlyOwner {
        mainMarketplace = _mainMarketplace;
    }

    /**
        This function should not be used
     */
    function claim(
        address _receiver,
        uint256 _quantity,
        address _currency,
        uint256 _pricePerToken,
        AllowlistProof calldata _allowlistProof,
        bytes memory _data
    ) public payable override {
        _receiver;
        _quantity;
        _currency;
        _pricePerToken;
        _allowlistProof;
        _data;
        revert("use claimAndList function instead");
    }

    // Can only claim 1 at a time
    function claimAndList(
        address _receiver,
        address _currency,
        uint256 _pricePerToken,
        AllowlistProof calldata _allowlistProof,
        uint256 _listingPrice,
        bytes memory _data
    ) external onlyOwner payable {
        uint256 tokenId = ERC721Drop.nextTokenIdToClaim();
        uint256 _quantity = 1;

        DropSinglePhase.claim(_receiver, _quantity, _currency, _pricePerToken, _allowlistProof, _data);

        IMarketplace.ListingParameters memory _params = IMarketplace.ListingParameters({
            assetContract: address(this),
            tokenId: tokenId,
            startTime: block.timestamp,
            secondsUntilEndTime: type(uint256).max - block.timestamp - 10000,
            quantityToList: _quantity,
            currencyToAccept: CurrencyTransferLib.NATIVE_TOKEN,
            reservePricePerToken: 0,
            buyoutPricePerToken: _listingPrice,
            listingType: IMarketplace.ListingType.Direct
        });

        IMarketplace(mainMarketplace).createListing(_params, _receiver);
    }

    // Should not be able to approve to other contracts
    function setApprovalForAll(address operator, bool _approved) public override(ERC721A) {
        require(approvedMarketplaces[operator], "can only be approved to approved marketplaces");
        // require(!TWAddress.isContract(operator), "can only be approved to NFTreasuryMarketplace contract");
        ERC721A.setApprovalForAll(operator, _approved);
    }

     /**
     * @notice Approve or disapprove a marketplace contract to enable or disable trading on it
     */
    function setApprovedMarketplace(address market, bool approved) public onlyOwner {
        approvedMarketplaces[market] = approved;
        emit MarketplaceApproved(market, approved);
    }

    function isApprovedForAll(address owner, address operator) public view override(ERC721A) returns (bool) {
        if (approvedMarketplaces[operator]) {
            return true;
        }
        return ERC721A.isApprovedForAll(owner, operator);
    }
 
    function approve(address to, uint256 tokenId) public override(ERC721A) {
        require(approvedMarketplaces[to], "can only be approved to approved marketplaces");
        ERC721A.approve(to, tokenId);
    }
}