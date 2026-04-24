// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ArtToken {
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;
    uint256 public totalSupply;

    address public immutable creator;
    address public immutable treasury;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    constructor(
        string memory _name,
        string memory _symbol,
        uint256 _supply,
        address _creator,
        address _treasury
    ) {
        name = _name;
        symbol = _symbol;
        creator = _creator;
        treasury = _treasury;
        uint256 total = _supply * (10 ** 18);
        totalSupply = total;
        balanceOf[msg.sender] = total;
        emit Transfer(address(0), msg.sender, total);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= amount, "ERC20: insufficient allowance");
            allowance[from][msg.sender] = allowed - amount;
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "ERC20: transfer from zero");
        require(to != address(0), "ERC20: transfer to zero");
        require(balanceOf[from] >= amount, "ERC20: insufficient balance");

        uint256 fee = amount / 100;
        uint256 creatorFee = fee / 2;
        uint256 protocolFee = fee - creatorFee;
        uint256 net = amount - fee;

        balanceOf[from] -= amount;
        balanceOf[to] += net;
        balanceOf[creator] += creatorFee;
        balanceOf[treasury] += protocolFee;

        emit Transfer(from, to, net);
        if (creatorFee > 0) emit Transfer(from, creator, creatorFee);
        if (protocolFee > 0) emit Transfer(from, treasury, protocolFee);
    }
}
