// SPDX-License-Identifier: unlicensed
pragma solidity 0.8.14;

import "./extension/Admin.sol";
import "./interface/IToken.sol";

contract Bridge is Admin {
    bool bridgeOn = true;
    IToken token;
    mapping(address => bool) public bridgeable;
    mapping(address => bool) public admins;
    event onBurn(address from, string to, uint amount, uint date);
    event onMint(address from, address to, uint amount, uint date);

    constructor(address _token) {
        _owner = msg.sender;
        token = IToken(_token);
        admin[msg.sender] = true;
    }

    function burn(string calldata to, uint amount) external {
        token.ownerBurn(msg.sender, amount);
        emit onBurn(msg.sender, to, amount, block.timestamp);
    }

    function mint(address to, uint amount) external {
        token.ownerMint(to, amount);
        emit onMint(msg.sender, to, amount, block.timestamp);
    }

    function balance(address account) external view returns (uint256) {
        return token.balanceOf(account);
    }
}
