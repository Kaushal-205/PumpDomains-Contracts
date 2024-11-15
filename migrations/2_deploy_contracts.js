const FeeReceiver = artifacts.require("FeeReceiver");
const DomainRecords = artifacts.require("DomainRecords");
const SwapBurnContract = artifacts.require("SwapBurnContract");
const TLDFactory = artifacts.require("TLDFactory");
const PublicResolver = artifacts.require("PublicResolver");

// Constants
const deployerAddress = "TV3XXs4igmj1p69FqhVHsBhAprBa28vQU4";
const sunswap_router = "TLDSUi2iYpVbyaQjnoKBQEFR6C98GqikPd"; // V2 router
const sunswap_factory = "TTpBzG9ZCExRTxWpy5AeEsoJxH8u9wdq9D"; // V2 Factory
const INITIAL_FEE = 50000000; // 50 TRX fee

module.exports = async function(deployer) {
  try {
    // 1. Deploy FeeReceiver first
    // await deployer.deploy(FeeReceiver, deployerAddress);
    // const feeReceiver = await FeeReceiver.deployed();
    // console.log('FeeReceiver deployed at:', feeReceiver.address);

    // // 2. Deploy PublicResolver
    // await deployer.deploy(PublicResolver);
    // const publicResolver = await PublicResolver.deployed();
    // console.log('PublicResolver deployed at:', publicResolver.address);

    // // 3. Deploy DomainRecords
    // await deployer.deploy(DomainRecords);
    // const domainRecords = await DomainRecords.deployed();
    // console.log('DomainRecords deployed at:', domainRecords.address);

    // 4. Deploy SwapBurnContract
    await deployer.deploy(SwapBurnContract, sunswap_router, sunswap_factory);
    const swapBurnContract = await SwapBurnContract.deployed();
    console.log('SwapBurnContract deployed at:', swapBurnContract.address);

    const feeReceiverAddress = "TTX8RrgLGgQEDgLTc8kVtCAnr7zETWgkqY";
    // 5. Deploy TLDFactory with updated parameters
    await deployer.deploy(
      TLDFactory,
      feeReceiverAddress,
      INITIAL_FEE
    );
    const tldFactory = await TLDFactory.deployed();
    console.log('TLDFactory deployed at:', tldFactory.address);

    // Log all deployed addresses
    console.log('\nDeployment Summary:');
    console.log('-------------------');
    // console.log('FeeReceiver:', feeReceiver.address);
    // console.log('PublicResolver:', publicResolver.address);
    // console.log('DomainRecords:', domainRecords.address);
    console.log('SwapBurnContract:', swapBurnContract.address);
    console.log('TLDFactory:', tldFactory.address);

  } catch (error) {
    console.error('Error during deployment:', error);
    throw error;
  }
};