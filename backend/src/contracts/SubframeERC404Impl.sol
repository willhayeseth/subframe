// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title SubframeERC404Impl
 * @notice Hybrid ERC-20 + ERC-721 token for Subframe Protocol identities.
 *
 * Rules:
 *  - Each holder earns EXACTLY ONE NFT when their balance first reaches >= 1e18.
 *  - The NFT is burned automatically when their balance drops below 1e18.
 *  - Max 1 NFT per wallet at any time.
 *  - Art variation index (0-68) assigned at mint time:
 *      keccak256(abi.encodePacked(holder, block.number)) % 69
 *
 * Supply: 6900 tokens (18 decimals)
 *   - 690 tokens (10%) to creator wallet
 *   - 6210 tokens (90%) to protocol liquidity wallet
 *
 * ERC-404 routing: transferFrom(from, to, valueOrId)
 *   - If valueOrId is a valid existing tokenId -> NFT transfer (moves 1e18 ERC-20)
 *   - Otherwise -> ERC-20 transfer
 */
contract SubframeERC404Impl {

    // ─── ERC-20 state ──────────────────────────────────────────────────────────
    string public name;
    string public symbol;
    uint8  public constant decimals = 18;
    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    // ─── ERC-721 state ─────────────────────────────────────────────────────────
    uint256 public nextTokenId;
    mapping(uint256 => address)   private _nftOwner;
    mapping(address => uint256[]) private _ownedTokens;   // length always 0 or 1
    mapping(uint256 => uint256)   private _artIndex;       // tokenId -> art variation (0-68)
    mapping(address => mapping(address => bool)) private _nftOperators;
    mapping(uint256 => address)   private _nftApproved;
    string public baseURI;

    // ─── Protocol ──────────────────────────────────────────────────────────────
    address public creator;
    address public treasury;
    bool    private _initialized;

    // ─── ERC-20 events ─────────────────────────────────────────────────────────
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    // ─── ERC-721 events ────────────────────────────────────────────────────────
    event NFTTransfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event NFTApproval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);

    // ─── Init ──────────────────────────────────────────────────────────────────

    function initialize(
        string  memory _name,
        string  memory _symbol,
        address _creator,
        address _treasury,
        address _liquidityRecipient,
        string  memory _baseURI
    ) external {
        require(!_initialized, "already initialized");
        _initialized = true;

        name     = _name;
        symbol   = _symbol;
        creator  = _creator;
        treasury = _treasury;
        baseURI  = _baseURI;

        uint256 total = 6900 * 10 ** 18;
        totalSupply   = total;

        uint256 creatorAmt   = 690  * 10 ** 18;
        uint256 liquidityAmt = total - creatorAmt;

        balanceOf[_creator]            = creatorAmt;
        balanceOf[_liquidityRecipient] = liquidityAmt;

        emit Transfer(address(0), _creator,            creatorAmt);
        emit Transfer(address(0), _liquidityRecipient, liquidityAmt);

        _syncNFTs(_creator);
        _syncNFTs(_liquidityRecipient);
    }

    // ─── ERC-20 ────────────────────────────────────────────────────────────────

    function transfer(address to, uint256 amount) external returns (bool) {
        _transfer(msg.sender, to, amount);
        return true;
    }

    /**
     * @dev ERC-404 routing: if valueOrId is a live tokenId, do NFT transfer.
     *      Otherwise ERC-20 transferFrom.
     */
    function transferFrom(address from, address to, uint256 valueOrId) external returns (bool) {
        if (_nftOwner[valueOrId] != address(0)) {
            // ERC-721 path — caller must be owner, approved for this token, or operator
            require(
                msg.sender == from ||
                _nftOperators[from][msg.sender] ||
                _nftApproved[valueOrId] == msg.sender,
                "ERC721: not authorized"
            );
            _nftTransferInternal(from, to, valueOrId);
            return true;
        }
        // ERC-20 path
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= valueOrId, "ERC20: insufficient allowance");
            allowance[from][msg.sender] = allowed - valueOrId;
        }
        _transfer(from, to, valueOrId);
        return true;
    }

    /**
     * @dev ERC-404 routing: if valueOrId is caller's NFT, approve it.
     *      Otherwise ERC-20 approve.
     */
    function approve(address spender, uint256 valueOrId) external returns (bool) {
        if (_nftOwner[valueOrId] == msg.sender) {
            _nftApproved[valueOrId] = spender;
            emit NFTApproval(msg.sender, spender, valueOrId);
        } else {
            allowance[msg.sender][spender] = valueOrId;
            emit Approval(msg.sender, spender, valueOrId);
        }
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "ERC20: from zero");
        require(to   != address(0), "ERC20: to zero");
        require(balanceOf[from] >= amount, "ERC20: insufficient");

        balanceOf[from] -= amount;
        balanceOf[to]   += amount;
        emit Transfer(from, to, amount);

        _syncNFTs(from);
        _syncNFTs(to);
    }

    // ─── ERC-721 auto-sync (0 or 1 NFT per holder) ────────────────────────────

    function _syncNFTs(address holder) internal {
        bool shouldHave = balanceOf[holder] >= 10 ** 18;
        bool hasNFT     = _ownedTokens[holder].length > 0;

        if (shouldHave && !hasNFT) {
            _mintNFT(holder);
        } else if (!shouldHave && hasNFT) {
            _burnNFT(_ownedTokens[holder][0]);
        }
    }

    function _mintNFT(address holder) internal {
        uint256 tokenId = nextTokenId++;
        uint256 art     = uint256(keccak256(abi.encodePacked(holder, block.number))) % 69;
        _artIndex[tokenId]  = art;
        _nftOwner[tokenId]  = holder;
        _ownedTokens[holder].push(tokenId);
        emit NFTTransfer(address(0), holder, tokenId);
    }

    function _burnNFT(uint256 tokenId) internal {
        address holder = _nftOwner[tokenId];
        require(holder != address(0), "ERC721: nonexistent");
        _ownedTokens[holder].pop(); // array length is always 0 or 1
        delete _nftOwner[tokenId];
        delete _nftApproved[tokenId];
        delete _artIndex[tokenId];
        emit NFTTransfer(holder, address(0), tokenId);
    }

    /**
     * @dev Transfer a specific NFT from `from` to `to`, moving 1e18 ERC-20
     *      alongside to keep ERC-404 sync intact. If `from` still holds >= 1e18
     *      after the transfer, a NEW NFT is minted for them (ERC-404 semantics).
     */
    function _nftTransferInternal(address from, address to, uint256 tokenId) internal {
        require(_nftOwner[tokenId] == from, "ERC721: wrong owner");
        require(to != address(0), "ERC721: to zero");
        require(balanceOf[from] >= 10 ** 18, "ERC721: insufficient token balance");

        // If `to` already holds an NFT, burn it first (max 1 per wallet)
        if (_ownedTokens[to].length > 0) {
            _burnNFT(_ownedTokens[to][0]);
        }

        // Remove this specific tokenId from `from`
        _ownedTokens[from].pop();
        delete _nftApproved[tokenId];

        // Move tokenId ownership to `to`
        _nftOwner[tokenId]  = to;
        _ownedTokens[to].push(tokenId);

        // Move 1e18 ERC-20 tokens WITHOUT triggering _syncNFTs (NFT already moved)
        balanceOf[from] -= 10 ** 18;
        balanceOf[to]   += 10 ** 18;
        emit Transfer(from, to, 10 ** 18);
        emit NFTTransfer(from, to, tokenId);

        // Re-check `from`: if they still have >= 1e18 but no NFT, mint a fresh one
        if (balanceOf[from] >= 10 ** 18 && _ownedTokens[from].length == 0) {
            _mintNFT(from);
        }
    }

    // ─── ERC-721 standard surface ──────────────────────────────────────────────

    function nftBalanceOf(address owner) external view returns (uint256) {
        return _ownedTokens[owner].length;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address o = _nftOwner[tokenId];
        require(o != address(0), "ERC721: nonexistent");
        return o;
    }

    function getApproved(uint256 tokenId) external view returns (address) {
        require(_nftOwner[tokenId] != address(0), "ERC721: nonexistent");
        return _nftApproved[tokenId];
    }

    function tokenURI(uint256 tokenId) external view returns (string memory) {
        require(_nftOwner[tokenId] != address(0), "ERC721: nonexistent");
        return string(abi.encodePacked(baseURI, _toString(_artIndex[tokenId]), ".json"));
    }

    function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256) {
        require(index < _ownedTokens[owner].length, "ERC721: out of bounds");
        return _ownedTokens[owner][index];
    }

    function ownedTokens(address owner) external view returns (uint256[] memory) {
        return _ownedTokens[owner];
    }

    function artIndexOfOwner(address owner) external view returns (uint256[] memory) {
        uint256[] memory tokens = _ownedTokens[owner];
        uint256[] memory art    = new uint256[](tokens.length);
        for (uint256 i = 0; i < tokens.length; i++) {
            art[i] = _artIndex[tokens[i]];
        }
        return art;
    }

    // Standard ERC-721 transfer aliases
    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        require(
            msg.sender == _nftOwner[tokenId] ||
            _nftOperators[_nftOwner[tokenId]][msg.sender] ||
            _nftApproved[tokenId] == msg.sender,
            "ERC721: not authorized"
        );
        _nftTransferInternal(from, to, tokenId);
    }

    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata) external {
        require(
            msg.sender == _nftOwner[tokenId] ||
            _nftOperators[_nftOwner[tokenId]][msg.sender] ||
            _nftApproved[tokenId] == msg.sender,
            "ERC721: not authorized"
        );
        _nftTransferInternal(from, to, tokenId);
    }

    // Named alias kept for backward compatibility
    function nftTransferFrom(address from, address to, uint256 tokenId) external {
        require(
            msg.sender == _nftOwner[tokenId] ||
            _nftOperators[_nftOwner[tokenId]][msg.sender] ||
            _nftApproved[tokenId] == msg.sender,
            "ERC721: not authorized"
        );
        _nftTransferInternal(from, to, tokenId);
    }

    function nftApprove(address to, uint256 tokenId) external {
        address owner = _nftOwner[tokenId];
        require(owner == msg.sender || _nftOperators[owner][msg.sender], "ERC721: not authorized");
        _nftApproved[tokenId] = to;
        emit NFTApproval(owner, to, tokenId);
    }

    function setApprovalForAll(address operator, bool approved) external {
        _nftOperators[msg.sender][operator] = approved;
        emit ApprovalForAll(msg.sender, operator, approved);
    }

    function isApprovedForAll(address owner, address operator) external view returns (bool) {
        return _nftOperators[owner][operator];
    }

    // ─── ERC-165 ───────────────────────────────────────────────────────────────

    /**
     * @dev Claims ERC-165 and a custom ERC-404 interface ID.
     *      Does NOT claim pure ERC-721 (balanceOf returns ERC-20, not NFT count).
     *      Does NOT claim pure ERC-20 (no pure ERC-20 interface standard).
     */
    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return
            interfaceId == 0x01ffc9a7 || // ERC-165
            interfaceId == 0x5b5e139f;   // ERC-721 Metadata (tokenURI, name, symbol)
    }

    // ─── Internal helpers ──────────────────────────────────────────────────────

    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) return "0";
        uint256 temp   = value;
        uint256 digits = 0;
        while (temp != 0) { digits++; temp /= 10; }
        bytes memory buf = new bytes(digits);
        while (value != 0) {
            digits--;
            buf[digits] = bytes1(uint8(48 + (value % 10)));
            value /= 10;
        }
        return string(buf);
    }
}
