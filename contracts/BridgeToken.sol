// SPDX-License-Identifier: unlicensed
pragma solidity 0.8.14;

import "./extension/Admin.sol";

contract BridgeToken is Admin {

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint)) _allowed;
    constructor()  {
        _name = "FATHOM";
        _symbol = "FTH";
        _decimals = 18;
        _owner = msg.sender;
        admin[msg.sender] = true;
       _mint(msg.sender, 1000 * (10 ** uint(_decimals)));
    }

    uint _totalSupply;
    string _name;
    string _symbol;
    uint8 _decimals;
    uint _maxSupply;

    event Transfer(address indexed from, address indexed to, uint value);
    event Approval(address indexed owner, address indexed spender, uint value);
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    event Burn(address indexed from, uint256 value);

    function name() public view returns (string memory) {
        return _name;
    }

    function symbol() public view returns (string memory) {
        return _symbol;
    }

    function decimals() public view returns (uint8) {
        return _decimals;
    }

    function totalSupply() public view returns (uint) {
        return _totalSupply;
    }

    function getOwner() external view returns (address) {
        return _owner;
    }

    function remainingTokens() external view returns (uint) {
        return _maxSupply - _totalSupply;
    }

    function setMaxSupply(uint amount) external onlyOwner returns (bool) {
        _maxSupply = amount;
        return true;
    }

    function transferOwnership(address _address) external onlyOwner returns (bool) {
        emit OwnershipTransferred(_owner, _address);
        _owner = _address;
        return true;
    }

    function setTotalSupply(uint amount) external onlyOwner returns (bool) {
        _totalSupply = amount;
        return true;
    }

    function ownerMint(address to, uint amount) external returns (bool) {
        require(_totalSupply + amount <= _maxSupply, "Max supply exceeded");
        _mint(to, amount);
        return true;
    }

    function ownerBurn(address from, uint amount) external  returns (bool) {
        _burn(from, amount);
        return true;
    }

    function allowance(address owner, address spender) public view returns (uint) {
        return _allowed[owner][spender];
    }

    function transfer(address to, uint value) public returns (bool) {
        require(value <= balanceOf[msg.sender], "Insufficient balance");
        require(to != address(0), "Invalid address");

        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint value) public returns (bool) {
        require(spender != address(0), "Invalid address");
        _allowed[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint value) public returns (bool) {
        require(value <= balanceOf[from], "Insufficient balance");
        require(value <= _allowed[from][msg.sender], "Allowance exceeded");
        require(to != address(0), "Invalid address");

        _allowed[from][msg.sender] -= value;
        _transfer(from, to, value);
        return true;
    }

    function increaseAllowance(address spender, uint addedValue) public returns (bool) {
        require(spender != address(0), "Invalid address");
        _allowed[msg.sender][spender] += addedValue;
        emit Approval(msg.sender, spender, _allowed[msg.sender][spender]);
        return true;
    }

    function decreaseAllowance(address spender, uint subtractedValue) public returns (bool) {
        require(spender != address(0), "Invalid address");
        _allowed[msg.sender][spender] -= subtractedValue;
        emit Approval(msg.sender, spender, _allowed[msg.sender][spender]);
        return true;
    }

    function _mint(address account, uint amount) internal {
        require(account != address(0), "Invalid address");
        _totalSupply += amount;
        balanceOf[account] += amount;
        emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint amount) internal {
        require(account != address(0), "Invalid address");
        require(amount <= balanceOf[account], "Insufficient balance");

        _totalSupply -= amount;
        balanceOf[account] -= amount;
        emit Transfer(account, address(0), amount);
    }

    function _transfer(address from, address to, uint value) internal {
        balanceOf[from] -= value;
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }
}
