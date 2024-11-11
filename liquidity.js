const ethers = require('ethers');

// Configuration object - edit these values as needed
const config = {
    token0Amount: 100,              // Amount of token0
    token1Amount: 100,              // Amount of token1
    token0Decimals: 18,             // Decimals for token0 (TRX)
    token1Decimals: 6,             // Decimals for token1 (Other token)
    token0Symbol: "TRX",            // Symbol for token0
    token1Symbol: "TOKEN",          // Symbol for token1
};

// Helper function to calculate sqrtPriceX96
function encodePriceSqrt(amount1, amount0) {
    const numerator = ethers.BigNumber.from(amount1);
    const denominator = ethers.BigNumber.from(amount0);
    const price = numerator.mul(ethers.BigNumber.from(2).pow(192)).div(denominator);
    const sqrtPriceX96 = ethers.BigNumber.from(price).sqrt();
    return sqrtPriceX96;
}

// Function to convert token amount to smallest unit (with decimals)
function toTokenAmount(amount, decimals) {
    return ethers.parseUnits(amount.toString(), decimals);
}

// Main calculation function
function calculateInitializationParams() {
    console.log('='.repeat(50));
    console.log('Uniswap V3 Pool Initialization Calculator');
    console.log('='.repeat(50));
    
    // Convert token amounts to smallest units
    const amount0InWei = toTokenAmount(config.token0Amount, config.token0Decimals);
    const amount1InWei = toTokenAmount(config.token1Amount, config.token1Decimals);
    
    // Calculate sqrtPriceX96
    const sqrtPriceX96 = encodePriceSqrt(amount1InWei, amount0InWei);
    
    // Print results
    console.log('\nInput Configuration:');
    console.log('-'.repeat(30));
    console.log(`${config.token0Symbol} Amount: ${config.token0Amount}`);
    console.log(`${config.token1Symbol} Amount: ${config.token1Amount}`);
    console.log(`${config.token0Symbol} Decimals: ${config.token0Decimals}`);
    console.log(`${config.token1Symbol} Decimals: ${config.token1Decimals}`);
    
    console.log('\nCalculated Values:');
    console.log('-'.repeat(30));
    console.log(`${config.token0Symbol} in Wei: ${amount0InWei.toString()}`);
    console.log(`${config.token1Symbol} in Wei: ${amount1InWei.toString()}`);
    console.log(`sqrtPriceX96: ${sqrtPriceX96.toString()}`);
    
    console.log('\nCode Snippets:');
    console.log('-'.repeat(30));
    console.log('1. Pool Initialization:');
    console.log(`await pool.initialize("${sqrtPriceX96.toString()}")`);
    
    console.log('\n2. Token Approvals:');
    console.log(`// Approve ${config.token0Symbol}`);
    console.log(`await ${config.token0Symbol.toLowerCase()}Token.approve(poolAddress, "${amount0InWei.toString()}")`);
    console.log(`\n// Approve ${config.token1Symbol}`);
    console.log(`await ${config.token1Symbol.toLowerCase()}Token.approve(poolAddress, "${amount1InWei.toString()}")`);
    
    return {
        sqrtPriceX96: sqrtPriceX96.toString(),
        amount0InWei: amount0InWei.toString(),
        amount1InWei: amount1InWei.toString()
    };
}

// Run the calculation
calculateInitializationParams();