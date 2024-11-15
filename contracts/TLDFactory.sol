// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PumpDomains.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title TLDFactory
 * @dev Factory contract for deploying new TLD contracts with optimized storage
 */
contract TLDFactory is Ownable{
    
    address payable public immutable feeReceiver;
    
    uint256 public fee;
    // Mapping for TLD tracking
    mapping(string => address) private tlds;

    event TLDDeployed(
        address indexed creator,
        address indexed tldAddress,
        string tld
    );
    event FeeUpdated(uint256 oldFee, uint256 newFee);

    constructor(
        address payable _feeReceiver,
        uint256 _fee
    ) Ownable(msg.sender){
        feeReceiver = _feeReceiver;
        fee = _fee;
    }

    /**
     * @dev Deploy a new PumpDomains contract for a specific TLD
     */
    function deployTLD(
        string calldata name,
        string calldata symbol,
        string calldata tld,
        address tokenAddress,
        address resolver,
        address domainRecords,
        address payable swapBurnContractAddress
    ) external payable returns (address) {
        // Validation
        require(tlds[tld] == address(0), "TLD exists");
        require(msg.value == fee, "Wrong fee");
        require(tokenAddress != address(0), "Invalid token");

        // Deploy new TLD contract
        PumpDomains newTLD = new PumpDomains(
            name,
            symbol,
            tld,
            tokenAddress,
            resolver,
            feeReceiver,
            domainRecords,
            swapBurnContractAddress
        );

        // Update state and transfer ownership
        tlds[tld] = address(newTLD);
        newTLD.transferOwnership(msg.sender);

        // Process fee
        (bool sent, ) = feeReceiver.call{value: msg.value}("");
        require(sent, "Fee transfer failed");

        emit TLDDeployed(msg.sender, address(newTLD), tld);
        return address(newTLD);
    }

    /**
     * @dev Set new deployment fee
     * @param _newFee New fee amount in TRX
     */
    function setFee(uint256 _newFee) external onlyOwner {
        uint256 oldFee = fee;
        fee = _newFee;
        emit FeeUpdated(oldFee, _newFee);
    }

    /**
     * @dev Retrieve TLD contract address
     */
    function getTLDAddress(string calldata tld) external view returns (address) {
        return tlds[tld];
    }

    /**
     * @dev Withdraw any stuck funds (admin only)
     */
    function withdraw() external {
        require(msg.sender == feeReceiver, "Not authorized");
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance");
        
        (bool success, ) = feeReceiver.call{value: balance}("");
        require(success, "Withdrawal failed");
    }
}