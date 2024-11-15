const {TronWeb} = require('tronweb');
const dotenv = require('dotenv');
dotenv.config();

// ABIs remain the same as in original code
const FACTORY_ABI = [
    {
        "inputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "name": "allPools",
        "outputs": [
            { "internalType": "address", "name": "", "type": "address" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "allPoolsLength",
        "outputs": [
            { "internalType": "uint256", "name": "", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

const POOL_ABI = [
    {
        "inputs": [],
        "name": "fee",
        "outputs": [
            { "internalType": "uint24", "name": "", "type": "uint24" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "token0",
        "outputs": [
            { "internalType": "address", "name": "", "type": "address" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "token1",
        "outputs": [
            { "internalType": "address", "name": "", "type": "address" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "liquidity",
        "outputs": [
            { "internalType": "uint128", "name": "", "type": "uint128" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

const TOKEN_ABI = [
    {
        "inputs": [],
        "name": "symbol",
        "outputs": [
            { "internalType": "string", "name": "", "type": "string" }
        ],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [
            { "internalType": "uint8", "name": "", "type": "uint8" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

async function getFilteredPoolInfo() {
    const PRIVATE_KEY = process.env.PRIVATE_KEY;
    const FULL_NODE = "https://api.nileex.io";
    const SOLIDITY_NODE = "https://api.nileex.io";
    const EVENT_SERVER = "https://event.nileex.io";
    
    const TARGET_TOKEN = "TYsbWxNnyTgsZaTFaue9hqpxkU3Fkco94a";

    const tronWeb = new TronWeb(
        FULL_NODE,
        SOLIDITY_NODE,
        EVENT_SERVER,
        PRIVATE_KEY
    );

    const FACTORY_ADDRESS = 'TUTGcsGDRScK1gsDPMELV2QZxeESWb1Gac';

    try {
        const factory = await tronWeb.contract(FACTORY_ABI, FACTORY_ADDRESS);
        const poolCount = await factory.allPoolsLength().call();
        console.log(`Total pools found: ${poolCount.toString()}`);

        const poolsInfo = [];

        for (let i = 0; i < poolCount; i++) {
            try {
                const poolAddress = await factory.allPools(i).call();
                const poolAddressBase58 = tronWeb.address.fromHex(poolAddress);
                
                const pool = await tronWeb.contract(POOL_ABI, poolAddressBase58);

                const [token0Address, token1Address] = await Promise.all([
                    pool.token0().call(),
                    pool.token1().call()
                ]);

                const token0AddressBase58 = tronWeb.address.fromHex(token0Address);
                const token1AddressBase58 = tronWeb.address.fromHex(token1Address);

                // Only process pools that contain our target token
                if (token0AddressBase58 === TARGET_TOKEN || token1AddressBase58 === TARGET_TOKEN) {
                    console.log(`\nFound matching pool ${i + 1}/${poolCount}: ${poolAddressBase58}`);

                    const [fee, liquidity] = await Promise.all([
                        pool.fee().call(),
                        pool.liquidity().call()
                    ]);

                    const token0 = await tronWeb.contract(TOKEN_ABI, token0AddressBase58);
                    const token1 = await tronWeb.contract(TOKEN_ABI, token1AddressBase58);

                    const [
                        token0Symbol,
                        token1Symbol,
                        token0Decimals,
                        token1Decimals
                    ] = await Promise.all([
                        token0.symbol().call(),
                        token1.symbol().call(),
                        token0.decimals().call(),
                        token1.decimals().call()
                    ]);

                    const liquidityStr = liquidity.toString();

                    const poolInfo = {
                        poolAddress: poolAddressBase58,
                        feeTier: (Number(fee) / 10000).toString() + '%',
                        token0: {
                            address: token0AddressBase58,
                            symbol: token0Symbol,
                            decimals: token0Decimals.toString()
                        },
                        token1: {
                            address: token1AddressBase58,
                            symbol: token1Symbol,
                            decimals: token1Decimals.toString()
                        },
                        liquidity: liquidityStr
                    };

                    poolsInfo.push(poolInfo);

                    console.log(`Pool Address: ${poolAddressBase58}`);
                    console.log(`Fee Tier: ${Number(fee) / 10000}%`);
                    console.log(`Token0: ${token0Symbol} (${token0AddressBase58})`);
                    console.log(`Token1: ${token1Symbol} (${token1AddressBase58})`);
                    console.log(`Liquidity: ${liquidityStr}`);
                }

            } catch (error) {
                console.error(`Error processing pool ${i}:`, error.message);
                continue;
            }
        }

        // Save filtered results to file
        const fs = require('fs');
        fs.writeFileSync(
            'filtered_pools_info.json',
            JSON.stringify(poolsInfo, null, 2)
        );
        console.log('\nFiltered pool information has been saved to filtered_pools_info.json');

    } catch (error) {
        console.error('Error:', error);
    }
}

// Run the script
getFilteredPoolInfo();