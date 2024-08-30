// SPDX-License-Identifier: unlicensed
pragma solidity 0.8.14;

import "./extension/Admin.sol";
import "./interface/IBridgeToken.sol";

contract Bridge is Admin {
    bool bridgeOn = true;

    mapping(address => bool) public bridgeable;
    mapping(address => bool) public admins;

    event TokenSent(string from, address indexed token, uint256 amount);
    event TokenReceived(
        address indexed to,
        address indexed token,
        uint256 amount
    );

    constructor(address token) {
        _owner = msg.sender;
        admin[msg.sender] = true;
        bridgeable[token] = true;
    }

    function bridgeReceive(
        address _token,
        uint256 _amount,
        address _to
    ) external {
        require(bridgeable[_token], "Token isn't bridgeable");
        IBridgeToken token = IBridgeToken(_token);
        token.ownerMint(_to, _amount);
        emit TokenReceived(_to, _token, _amount);
    }

    function bridgeSend(
        address _token,
        uint256 _amount,
        string memory _to
    ) external {
        require(bridgeable[_token], "Token isn't bridgeable");
        IBridgeToken token = IBridgeToken(_token);
        token.ownerBurn(msg.sender, _amount);
        emit TokenSent(_to, _token, _amount);
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

    function bridgeTransfer(
        address _token,
        address from,
        address to,
        uint256 amount
    ) external {
        require(bridgeable[_token], "Token isn't bridgeable");
        IBridgeToken token = IBridgeToken(_token);
        token.transfer(from, to, amount);
    }
}
