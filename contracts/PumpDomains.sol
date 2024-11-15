// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Counters.sol";
import "./IPublicResolver.sol";
import "./DomainRecords.sol";
import "./SwapBurnContract.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PumpDomains is ERC721URIStorage, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    event DomainRegistered(
        bytes32 indexed domain,
        address indexed owner,
        uint256 tokenId,
        uint256 expires
    );
    event DomainRenewed(
        bytes32 indexed domain,
        address indexed owner,
        uint256 newExpires
    );
    event ResolverSet(bytes32 indexed domain, address indexed resolver);

    struct Domain {
        address resolver;
        uint256 expires;
        string name;
    }

    struct PriceConfig {
        uint256 length;
        uint256 price;
    }

    // Storage
    string public tld;
    uint256 public constant EXPIRATION_PERIOD = 365 days;
    Counters.Counter private _tokenIds;
    address public immutable tokenAddress;
    address payable public immutable feeReceiver;

    mapping(bytes32 => Domain) public domains;
    mapping(bytes32 => uint256) public domainToTokenId;
    mapping(uint256 => bytes32) public tokenIdToDomainHash;

    PriceConfig[] public priceConfigs;

    IPublicResolver public immutable publicResolver;
    DomainRecords public immutable domainRecords;
    SwapBurnContract public immutable swapBurnContract;

    constructor(
        string memory _name,
        string memory _symbol,
        string memory _tld,
        address _tokenAddress,
        address _resolverAddress,
        address payable _feeReceiver,
        address _domainRecordsAddress,
        address payable _swapBurnContract
    ) ERC721(_name, _symbol) Ownable(msg.sender) {
        tld = _tld;
        tokenAddress = _tokenAddress;
        publicResolver = IPublicResolver(_resolverAddress);
        feeReceiver = _feeReceiver;
        domainRecords = DomainRecords(_domainRecordsAddress);
        swapBurnContract = SwapBurnContract(_swapBurnContract);

        priceConfigs.push(PriceConfig(3, 10 * 1e6));
        priceConfigs.push(PriceConfig(4, 5 * 1e6));
        priceConfigs.push(PriceConfig(5, 3 * 1e6));
    }

     // Register a domain, mint the ERC721 token, set ownership, expiration, and resolver
    function registerDomain(string memory name) external payable nonReentrant {
        bytes32 domainHash = _generateDomainHash(name);
        require(domainToTokenId[domainHash] == 0, "Domain already registered");

        uint256 domainPrice = getDomainPrice(name);
        require(msg.value >= domainPrice, "Insufficient payment");

        // First calculate the shares
        uint256 contractShare = (domainPrice * 20) / 100; // 20% for feeReceiver
        uint256 swapAmount = (domainPrice * 80) / 100;    // 80% for swap and burn

        // 1. First send the 20% to feeReceiver
        (bool feeReceiverSent, ) = feeReceiver.call{value: contractShare}("");
        require(feeReceiverSent, "Fee transfer failed");
        
        // 2. Send 80% to swap and burn contract
        swapBurnContract.swapAndBurn{value: swapAmount}(tokenAddress);

        // 3. Calculate and refund excess payment if any
        uint256 excessAmount = msg.value - domainPrice;
        if (excessAmount > 0) {
            (bool refundSent, ) = payable(msg.sender).call{value: excessAmount}("");
            
            require(refundSent, "Refund transfer failed");
        }

        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        // Register domain
        _safeMint(msg.sender, newTokenId);
        domainToTokenId[domainHash] = newTokenId;
        tokenIdToDomainHash[newTokenId] = domainHash;

        uint256 registrationDate = block.timestamp;
        uint256 expirationDate = registrationDate + EXPIRATION_PERIOD;

        domains[domainHash] = Domain({
            resolver: msg.sender,
            expires: expirationDate,
            name: name
        });

        // Link the domain to the user's address in the public resolver
        publicResolver.linkDomainToAddress(domainHash, msg.sender);

        // Record the domain in the DomainRecords contract with all necessary details, including the factory address
        domainRecords.recordDomain(
            string(abi.encodePacked(name, ".", tld)), // Full domain name
            msg.sender, // Owner
            registrationDate, // Registration date
            expirationDate, // Expiration date
            domainPrice, // Registration price
            address(this) // Pass the current contract address as the factory address
        );

        emit DomainRegistered(
            domainHash,
            msg.sender,
            newTokenId,
            domains[domainHash].expires
        );
        emit ResolverSet(domainHash, msg.sender);
    }

    // Renew an existing domain by extending its expiration
    function renewDomain(string memory name) external payable nonReentrant {
        bytes32 domainHash = _generateDomainHash(name);
        require(ownerOf(domainToTokenId[domainHash]) == msg.sender, "Not domain owner");

        uint256 renewalPrice = getDomainPrice(name);
        require(msg.value >= renewalPrice, "Insufficient payment");

        (bool sent, ) = feeReceiver.call{value: renewalPrice}("");
        require(sent, "Transfer failed");

        if (msg.value > renewalPrice) {
            (bool refundSent, ) = msg.sender.call{value: msg.value - renewalPrice}("");
            require(refundSent, "Refund transfer failed");
        }

        domains[domainHash].expires += EXPIRATION_PERIOD;
        emit DomainRenewed(domainHash, msg.sender, domains[domainHash].expires);
    }


    function setPrimaryDomain(string calldata name) external {
        bytes32 domainHash = _generateDomainHash(name);
        require(domainToTokenId[domainHash] != 0, "Domain not found");
        require(ownerOf(domainToTokenId[domainHash]) == msg.sender, "Not domain owner");
        publicResolver.setPrimaryDomain(msg.sender, domainHash);
    }

    function setResolver(string calldata name, address resolver) external {
        bytes32 domainHash = _generateDomainHash(name);
        require(ownerOf(domainToTokenId[domainHash]) == msg.sender, "Not domain owner");
        domains[domainHash].resolver = resolver;
        emit ResolverSet(domainHash, resolver);
    }
    
    function createSubDomain(
        string calldata parentName,
        string calldata subName,
        address owner
    ) external {
        bytes32 parentHash = _generateDomainHash(parentName);
        require(ownerOf(domainToTokenId[parentHash]) == msg.sender, "Not domain owner");

        bytes32 subDomainHash = keccak256(
            abi.encodePacked(parentHash, subName)
        );
        require(domainToTokenId[subDomainHash] == 0, "Domain already registered");

        _mintSubdomain(subName, subDomainHash, owner);
    }

    function setPriceConfig(uint256 length, uint256 price) external onlyOwner {
        for (uint256 i = 0; i < priceConfigs.length; i++) {
            if (priceConfigs[i].length == length) {
                priceConfigs[i].price = price;
                return;
            }
        }
        priceConfigs.push(PriceConfig(length, price));
    }

    function _mintSubdomain(
        string memory subName,
        bytes32 subDomainHash,
        address owner
    ) internal {
        _tokenIds.increment();
        uint256 newSubTokenId = _tokenIds.current();

        _safeMint(owner, newSubTokenId);
        domainToTokenId[subDomainHash] = newSubTokenId;
        tokenIdToDomainHash[newSubTokenId] = subDomainHash;

        domains[subDomainHash] = Domain(
            owner,
            block.timestamp + EXPIRATION_PERIOD,
            subName
        );

        publicResolver.linkDomainToAddress(subDomainHash, owner);

        emit DomainRegistered(
            subDomainHash,
            owner,
            newSubTokenId,
            domains[subDomainHash].expires
        );
    }

    // View functions
    function getDomainPrice(string memory name) public view returns (uint256) {
        uint256 length = bytes(name).length;
        require(length >= 3, "Domain name too short");

        for (uint256 i = 0; i < priceConfigs.length; i++) {
            if (priceConfigs[i].length == length) {
                return priceConfigs[i].price;
            }
            // If we're at the last config and the length is greater, use that price
            if (i == priceConfigs.length - 1 && length > priceConfigs[i].length) {
                return priceConfigs[i].price;
            }
        }
        
        revert("Invalid domain length");
    }

    function _generateDomainHash(
        string memory name
    ) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(_toLowerCase(name), ".", tld));
    }

    function _toLowerCase(
        string memory str
    ) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        for (uint256 i = 0; i < bStr.length; i++) {
            bLower[i] = bytes1(
                uint8(bStr[i]) >= 65 && uint8(bStr[i]) <= 90
                    ? uint8(bStr[i]) + 32
                    : uint8(bStr[i])
            );
        }
        return string(bLower);
    }

    function checkOwnership(
        string calldata domainName
    ) external view returns (bool) {
        bytes32 domainHash = _generateDomainHash(domainName);
        uint256 tokenId = domainToTokenId[domainHash];
        return ownerOf(tokenId) == msg.sender;
    }

    function getDomainName(
        bytes32 domainHash
    ) external view returns (string memory) {
        require(
            domains[domainHash].expires > block.timestamp,
            "Domain expired"
        );
        return string(abi.encodePacked(domains[domainHash].name, ".", tld));
    }

    // Admin functions
    function burnDomain(string calldata name) external onlyOwner {
        bytes32 domainHash = _generateDomainHash(name);
        uint256 tokenId = domainToTokenId[domainHash];
        require(tokenId != 0, "Domain not exists");

        _burn(tokenId);
        delete domainToTokenId[domainHash];
        delete tokenIdToDomainHash[tokenId];
        delete domains[domainHash];
    }
    // Set the token URI for an NFT
    function setTokenURI(uint256 tokenId, string memory _tokenURI) external {
        require(
            msg.sender == ownerOf(tokenId) ||
                msg.sender == getApproved(tokenId) ||
                isApprovedForAll(ownerOf(tokenId), msg.sender),
            "Not approved or owner"
        );
        _setTokenURI(tokenId, _tokenURI);
    }
}
