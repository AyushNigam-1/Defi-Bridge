//SPDX-License-Identifier: unlicensed
pragma solidity 0.8.14;

interface IToken {
    function ownerMint(address to, uint amount) external returns(bool);
    function ownerBurn(address from, uint amount) external returns(bool);
    function balanceOf(address account) external view returns (uint256);
}