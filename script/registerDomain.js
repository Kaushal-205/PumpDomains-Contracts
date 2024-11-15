const TronWeb = require('tronweb');
const dotenv = require('dotenv');
dotenv.config();

const abi = require("../build/contracts/PumpDomains.json").abi;

async function registerDomain() {
    try {
        // Initialize TronWeb
        const tronWeb = new TronWeb({
            fullHost: 'https://api.nileex.io', // Use Nile testnet or change to mainnet
            privateKey: process.env.PRIVATE_KEY // Your private key from .env file
        });

        // Contract address and parameters
        const contractAddress = "TNeudV9ekf9s1vJJ6He7TG7tQqqPaaovYW"; // Replace with your deployed contract address
        const domainName = "tst"; // The domain name you want to register

        // Get contract instance
        const contract = await tronWeb.contract(abi, contractAddress);

        // Get domain price
        const price = await contract.getDomainPrice(domainName).call();
        console.log('Domain Price:', tronWeb.fromSun(price.toString()), 'TRX');

        // Register domain
        // Add some buffer to the price to cover any potential fees
        const priceWithBuffer = tronWeb.toSun(tronWeb.fromSun(price) * 1.1);

        console.log('Attempting to register domain:', domainName);
        console.log('Transaction value:', tronWeb.fromSun(priceWithBuffer), 'TRX');

        const transaction = await contract.registerDomain(domainName).send({
            callValue: priceWithBuffer,
            feeLimit: 1000_000_000 // Adjust fee limit as needed
        });

        console.log('Transaction successful!');
        console.log('Transaction ID:', transaction);

        // Wait for transaction confirmation
        console.log('Waiting for transaction confirmation...');
        const receipt = await tronWeb.trx.getTransactionInfo(transaction);
        const tldAddressBase58 = tronWeb.address.fromHex(receipt);
        console.log('Transaction confirmed!');
        console.log('Receipt:', receipt);

    } catch (error) {
        console.error('Error:', error);
        if (error.transaction) {
            console.error('Transaction:', error.transaction);
        }
        if (error.output) {
            console.error('Contract output:', error.output);
        }
    }
}


registerDomain().then(() => {
    console.log('Script completed');
}).catch(err => {
    console.error('Script failed:', err);
});