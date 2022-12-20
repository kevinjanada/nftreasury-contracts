// SPDX-License-Identifier: Apache-2.0
pragma solidity ^0.8.11;

import "@thirdweb-dev/contracts/marketplace/Marketplace.sol";

contract NFTreasuryMarketplace is Marketplace {
  constructor(address _nativeTokenWrapper) Marketplace(_nativeTokenWrapper) {}
}