const TLDFactory = artifacts.require("TLDFactory");

module.exports = async function(deployer, network, accounts) {
  try {
    // Get the deployed TLDFactory instance
    const tldFactory = await TLDFactory.at("TVPTZZrme2nXZ9T6wmZjaPECQt7D1bHj88");
    
    // TLD deployment parameters
    const name = ""; // Replace with your desired name
    const symbol = "TLD";  // Replace with your desired symbol
    const tld = "tld";     // Replace with your desired TLD (e.g., "pump")
    const tokenAddress = "YOUR_TOKEN_ADDRESS"; // Replace with your token address in base58
    const swapBurnContractAddress = "TBnXQBhLaJdQSUaXwY5DAPdWzQRic2B7XL";
    
    // Calculate the required fee in SUN (TRX * 1e6)
    const TLD_CREATION_FEE = '1000000'; // 50 TRX in SUN
    
    console.log('Deploying new TLD...');
    console.log('Name:', name);
    console.log('Symbol:', symbol);
    console.log('TLD:', tld);
    console.log('Token Address:', tokenAddress);
    console.log('SwapBurn Contract:', swapBurnContractAddress);
    
    // Deploy the new TLD
    const tx = await tldFactory.deployTLD(
      name,
      symbol,
      tld,
      tokenAddress,
      swapBurnContractAddress,
      {
        from: accounts[0],
        value: TLD_CREATION_FEE,
        fee_limit: 150000000,
        callValue: TLD_CREATION_FEE
      }
    );
    
    console.log('Transaction:', tx.tx);
    
    // Get the deployed TLD address
    const tldAddress = await tldFactory.getTLDAddress(tld);
    console.log('New TLD deployed at:', tldAddress);
    
    // Log all the contract addresses used for reference
    console.log('\nContract Addresses Used:');
    console.log('TLDFactory:', 'TVPTZZrme2nXZ9T6wmZjaPECQt7D1bHj88');
    console.log('FeeReceiver:', 'TVtm6e4m6giS6Vo62mZH9QTeQJBx2uJhrZ');
    console.log('PublicResolver:', 'TBZTDKPBXDcwNi7TC492iJFFHU13b7u7Hh');
    console.log('DomainRecords:', 'TXrKtFEefChzqwXhpWYqVbrxCy1VdAEpgN');
    console.log('SwapBurnContract:', 'TBnXQBhLaJdQSUaXwY5DAPdWzQRic2B7XL');
    
  } catch (error) {
    console.error('Error deploying TLD:', error);
    throw error;
  }
};