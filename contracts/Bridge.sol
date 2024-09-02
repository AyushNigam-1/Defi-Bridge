// SPDX-License-Identifier: unlicensed
pragma solidity 0.8.14;

import "./extension/Admin.sol";
import "./interface/IToken.sol";

contract Bridge is Admin {
    bool bridgeOn = true;
    IToken token;
    mapping(address => bool) public bridgeable;
    mapping(address => bool) public admins;
    enum Step {
        Burn,
        Mint
    }
    event Transaction(
        address from,
        address to,
        uint amount,
        uint date,
        Step indexed step
    );

    constructor(address _token) {
        _owner = msg.sender;
        token = IToken(_token);
        admin[msg.sender] = true;
        bridgeable[_token] = true;
    }

    modifier onlyBridgeable(address _token) {
        require(bridgeable[_token], "Token isn't bridgeable");
        _;
    }

    function addToken(address _token) external onlyOwner {
        bridgeable[_token] = true;
    }

    function removeToken(address _token) external onlyOwner {
        bridgeable[_token] = false;
    }

    function bridgeStatus(bool _status) external onlyOwner {
        bridgeOn = _status;
    }

    function burn(address to, uint amount) external {
        token.ownerBurn(msg.sender, amount);
        emit Transaction(msg.sender, to, amount, block.timestamp, Step.Burn);
    }

    function mint(address to, uint amount) external {
        token.ownerMint(to, amount);
        emit Transaction(msg.sender, to, amount, block.timestamp, Step.Mint);
    }

    function balance(address account) external view returns (uint256) {
        return token.balanceOf(account);
    }
}
