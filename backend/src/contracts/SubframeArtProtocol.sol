// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC1155Receiver {
    function onERC1155Received(address operator, address from, uint256 id, uint256 value, bytes calldata data) external returns (bytes4);
    function onERC1155BatchReceived(address operator, address from, uint256[] calldata ids, uint256[] calldata values, bytes calldata data) external returns (bytes4);
}

contract SubframeArtProtocol {
    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event URI(string value, uint256 indexed id);
    event ArtCreated(uint256 indexed tokenId, address indexed creator, string metadataUri);
    event ArtMinted(uint256 indexed tokenId, address indexed buyer, uint256 newSupply, uint256 price);
    event ArtBurned(uint256 indexed tokenId, address indexed seller, uint256 amount, uint256 payout);

    struct Art {
        address creator;
        string metadataUri;
        uint256 supply;
        bool exists;
    }

    mapping(uint256 => mapping(address => uint256)) private _balances;
    mapping(address => mapping(address => bool)) private _operatorApprovals;
    mapping(uint256 => Art) public arts;

    uint256 public nextTokenId;
    address public owner;
    address public platform;
    address public treasury;

    uint256 public constant BASE_PRICE = 0.001 ether;
    uint256 public constant PRICE_INCREMENT = 0.0001 ether;
    uint256 public constant CREATOR_FEE_BPS = 50;
    uint256 public constant PROTOCOL_FEE_BPS = 50;

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyPlatform() {
        require(msg.sender == platform || msg.sender == owner, "Not authorized");
        _;
    }

    constructor(address _treasury) {
        owner = msg.sender;
        platform = msg.sender;
        treasury = _treasury;
    }

    function setPlatform(address _platform) external onlyOwner {
        platform = _platform;
    }

    function setTreasury(address _treasury) external onlyOwner {
        treasury = _treasury;
    }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Zero address");
        owner = newOwner;
    }

    function createArt(address creator, string calldata metadataUri) external onlyPlatform returns (uint256 tokenId) {
        tokenId = nextTokenId++;
        arts[tokenId] = Art({ creator: creator, metadataUri: metadataUri, supply: 0, exists: true });
        emit ArtCreated(tokenId, creator, metadataUri);
        emit URI(metadataUri, tokenId);
    }

    function getMintPrice(uint256 tokenId) public view returns (uint256) {
        require(arts[tokenId].exists, "Art not found");
        return BASE_PRICE + (arts[tokenId].supply * PRICE_INCREMENT);
    }

    function getBurnPayout(uint256 tokenId) public view returns (uint256) {
        require(arts[tokenId].exists, "Art not found");
        uint256 s = arts[tokenId].supply;
        require(s > 0, "No supply");
        uint256 price = BASE_PRICE + ((s - 1) * PRICE_INCREMENT);
        uint256 fees = (price * (CREATOR_FEE_BPS + PROTOCOL_FEE_BPS)) / 10000;
        return price - fees;
    }

    function totalSupply(uint256 tokenId) external view returns (uint256) {
        return arts[tokenId].supply;
    }

    function mint(uint256 tokenId) external payable {
        require(arts[tokenId].exists, "Art not found");
        uint256 price = getMintPrice(tokenId);
        require(msg.value >= price, "Not enough ETH");

        uint256 excess = msg.value - price;
        if (excess > 0) {
            (bool ok,) = payable(msg.sender).call{value: excess}("");
            require(ok, "Refund failed");
        }

        uint256 creatorFee = (price * CREATOR_FEE_BPS) / 10000;
        uint256 protocolFee = (price * PROTOCOL_FEE_BPS) / 10000;

        arts[tokenId].supply++;
        _balances[tokenId][msg.sender]++;

        emit TransferSingle(msg.sender, address(0), msg.sender, tokenId, 1);
        emit ArtMinted(tokenId, msg.sender, arts[tokenId].supply, price);

        (bool creatorOk,) = payable(arts[tokenId].creator).call{value: creatorFee}("");
        require(creatorOk, "Creator fee failed");

        (bool protocolOk,) = payable(treasury).call{value: protocolFee}("");
        require(protocolOk, "Protocol fee failed");
    }

    function burn(uint256 tokenId, uint256 amount) external {
        require(arts[tokenId].exists, "Art not found");
        require(_balances[tokenId][msg.sender] >= amount, "Insufficient balance");
        uint256 s = arts[tokenId].supply;
        require(s >= amount, "Supply underflow");

        uint256 totalPayout = 0;
        for (uint256 i = 0; i < amount; i++) {
            uint256 price = BASE_PRICE + ((s - 1 - i) * PRICE_INCREMENT);
            uint256 fees = (price * (CREATOR_FEE_BPS + PROTOCOL_FEE_BPS)) / 10000;
            totalPayout += price - fees;
        }

        arts[tokenId].supply -= amount;
        _balances[tokenId][msg.sender] -= amount;

        emit TransferSingle(msg.sender, msg.sender, address(0), tokenId, amount);
        emit ArtBurned(tokenId, msg.sender, amount, totalPayout);

        (bool ok,) = payable(msg.sender).call{value: totalPayout}("");
        require(ok, "Payout failed");
    }

    function balanceOf(address account, uint256 id) public view returns (uint256) {
        return _balances[id][account];
    }

    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory) {
        require(accounts.length == ids.length, "Length mismatch");
        uint256[] memory out = new uint256[](accounts.length);
        for (uint256 i = 0; i < accounts.length; i++) {
            out[i] = _balances[ids[i]][accounts[i]];
        }
        return out;
    }

    function setApprovalForAll(address operator, bool approved) external {
        _operatorApprovals[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address account, address operator) public view returns (bool) {
        return _operatorApprovals[account][operator];
    }

    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external {
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "Not approved");
        require(_balances[id][from] >= amount, "Insufficient balance");
        require(to != address(0), "Transfer to zero");
        _balances[id][from] -= amount;
        _balances[id][to] += amount;
        emit TransferSingle(msg.sender, from, to, id, amount);
        _doSafeTransferCheck(from, to, id, amount, data);
    }

    function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data) external {
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "Not approved");
        require(ids.length == amounts.length, "Length mismatch");
        require(to != address(0), "Transfer to zero");
        for (uint256 i = 0; i < ids.length; i++) {
            require(_balances[ids[i]][from] >= amounts[i], "Insufficient balance");
            _balances[ids[i]][from] -= amounts[i];
            _balances[ids[i]][to] += amounts[i];
        }
        emit TransferBatch(msg.sender, from, to, ids, amounts);
        _doBatchSafeTransferCheck(from, to, ids, amounts, data);
    }

    function uri(uint256 tokenId) external view returns (string memory) {
        return arts[tokenId].metadataUri;
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0xd9b67a26 || interfaceId == 0x01ffc9a7;
    }

    function _doSafeTransferCheck(address from, address to, uint256 id, uint256 amount, bytes calldata data) internal {
        if (_isContract(to)) {
            bytes4 resp = IERC1155Receiver(to).onERC1155Received(msg.sender, from, id, amount, data);
            require(resp == 0xf23a6e61, "Unsafe receiver");
        }
    }

    function _doBatchSafeTransferCheck(address from, address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data) internal {
        if (_isContract(to)) {
            bytes4 resp = IERC1155Receiver(to).onERC1155BatchReceived(msg.sender, from, ids, amounts, data);
            require(resp == 0xbc197c81, "Unsafe batch receiver");
        }
    }

    function _isContract(address addr) internal view returns (bool) {
        uint256 size;
        assembly { size := extcodesize(addr) }
        return size > 0;
    }

    function emergencyWithdraw() external onlyOwner {
        (bool ok,) = payable(owner).call{value: address(this).balance}("");
        require(ok, "Failed");
    }

    receive() external payable {}
}
