// SPDX-License-Identifier: unlicensed
pragma solidity 0.8.14;

import "./extension/Admin.sol";
import "./interface/IBridgeToken.sol";

contract Bridge is Admin {
    bool bridgeOn = true;

    mapping(address => bool) public bridgeable;
    mapping(address => bool) public admins;

    struct Lock {
        address owner;
        address token;
        uint256 amount;
        bool confirmed;
    }

    mapping(uint256 => Lock) public lockedTokens;

    uint256 public lockId;


    constructor(address token) {
        _owner = msg.sender;
        admin[msg.sender] = true;
        bridgeable[token] = true;
    }

    modifier onlyBridgeable(address _token) {
        require(bridgeable[_token], "Token isn't bridgeable");
        _;
    }

    function lockTokens(
        address _from,
        address _token,
        uint256 _amount
    ) external onlyBridgeable(_token) returns (uint256) {
        IBridgeToken token = IBridgeToken(_token);
        require(
            token.transferFrom(_from, address(this), _amount),
            "Transfer failed"
        );
        uint256 currentLockId = lockId;
        lockedTokens[currentLockId] = Lock({
            owner: _from,
            token: _token,
            amount: _amount,
            confirmed: false
        });
        lockId++;
        return currentLockId;
    }

    function confirmAndBurn(uint256 _lockId) external onlyAdmin {
        Lock storage lock = lockedTokens[_lockId];

        require(!lock.confirmed, "Tokens already confirmed");

        lock.confirmed = true;
        IBridgeToken token = IBridgeToken(lock.token);

        require(token.ownerBurn(address(this), lock.amount), "Burn failed");

    }

    function revertLockedTokens(uint256 _lockId) external {
        Lock storage lock = lockedTokens[_lockId];

        require(!lock.confirmed, "Tokens already confirmed");

        IBridgeToken token = IBridgeToken(lock.token);

        require(
            token.transfer(address(this), lock.owner, lock.amount),
            "Refund failed"
        );

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

    function transfer(
        address _token,
        address from,
        address to,
        uint256 amount
    ) external {
        require(bridgeable[_token], "Token isn't bridgeable");
        IBridgeToken token = IBridgeToken(_token);
        require(token.transfer(from, to, amount) , 'Transaction Failed');
    }
}
