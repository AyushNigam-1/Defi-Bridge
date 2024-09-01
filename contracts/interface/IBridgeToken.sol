//SPDX-License-Identifier: unlicensed
pragma solidity 0.8.14;

interface IBridgeToken {
    function ownerMint(address to, uint amount) external returns(bool);
    function ownerBurn(address from, uint amount) external returns(bool);
    function transfer(address from, address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
}