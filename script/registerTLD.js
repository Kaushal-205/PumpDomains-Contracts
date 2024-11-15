const {TronWeb} = require('tronweb');
require('dotenv').config();

const TLD_FACTORY_ABI = require("../build/contracts/TLDFactory.json");

async function deployTLD() {
    try {
        const PRIVATE_KEY = process.env.PRIVATE_KEY;
        // Network configuration
        const FULL_NODE = "https://api.nileex.io";
        const SOLIDITY_NODE = "https://api.nileex.io";
        const EVENT_SERVER = "https://event.nileex.io";

        const tronWeb = new TronWeb(
            FULL_NODE,
            SOLIDITY_NODE,
            EVENT_SERVER,
            PRIVATE_KEY
        );
        
        // Contract addresses
        const TLD_FACTORY_ADDRESS = "TEP15UbxfeQHF6B7BrYMBsKNdRaYMRVDWg";
    
        console.log('TronWeb initialized');
        console.log('Connected account:', tronWeb.defaultAddress.base58);

        // Get contract instance
        const tldFactory = await tronWeb.contract(TLD_FACTORY_ABI.abi, TLD_FACTORY_ADDRESS);
        
        // TLD Parameters
        const tldParams = {
            name: "jsd",
            symbol: "jsd",
            tld: "jsd",
            tokenAddress: "TUQJvMCiPfaYLDyQg8cKkK64JSkUVZh4qq",
            resolver: "TEGPyPGd5sEi3GWtessFkMq6Yk6V6vByHg",
            domainRecords: "TEwuyu6khFBMLHiBHAkKqRuXxLW5D3m1b8",
            swapBurnContractAddress: "TLRctEsy1AR6rVqqhs7TMEnjf25R158zou"
        };

        // Calculate the fee in SUN (1 TRX = 1,000,000 SUN)
        const TLD_CREATION_FEE = 50000000; // 50 TRX

        console.log('Deploying TLD with parameters:');
        console.log(tldParams);

        // Deploy the TLD
        const transaction = await tldFactory.deployTLD(
            tldParams.name,
            tldParams.symbol,
            tldParams.tld,
            tldParams.tokenAddress,
            tldParams.resolver,
            tldParams.domainRecords,
            tldParams.swapBurnContractAddress
        ).send({
            callValue: TLD_CREATION_FEE,
            feeLimit: 1000000000
        });

        console.log('Transaction sent:', transaction);

        // Wait for a few blocks to ensure the transaction is confirmed
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Get the deployed TLD address
        const tldAddress = await tldFactory.getTLDAddress(tldParams.tld).call();
        
        // Convert hex address to base58
        const tldAddressBase58 = tronWeb.address.fromHex(tldAddress);
        
        console.log('TLD deployed at (hex):', tldAddress);
        console.log('TLD deployed at (base58):', tldAddressBase58);

        return {
            success: true,
            transaction,
            tldAddress,
            tldAddressBase58
        };

    } catch (error) {
        console.error('Error deploying TLD:', error.message || error);
        return {
            success: false,
            error: error.message || error
        };
    }
}

deployTLD()
    .then(result => {
        if (result.success) {
            console.log('Deployment completed successfully!');
        } else {
            console.log('Deployment failed:', result.error);
        }
        process.exit(0);
    })
    .catch(error => {
        console.error('Script execution failed:', error);
        process.exit(1);
    });