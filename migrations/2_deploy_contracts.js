const PublicResolver = artifacts.require("PublicResolver.sol");
const FeeReceiver = artifacts.require("FeeReceiver.sol");
const DomainRecords = artifacts.require("DomainRecords.sol");

const TldFactory = artifacts.require("TLDFactory.sol");
const { TronWeb } = require("tronweb");

module.exports = async function (deployer, accounts) {
  const deployerAddress = "TEqqmXaynt9XmmcBNYbJh5tMVDmm183c2r";

  // // Deploy the PublicResolver contract
  await deployer.deploy(PublicResolver);
  await deployer.deploy(FeeReceiver, deployerAddress);
  await deployer.deploy(DomainRecords);
  await deployer.deploy(
    TldFactory,
    TronWeb.address.fromHex(PublicResolver.address),
    TronWeb.address.fromHex(FeeReceiver.address),
    TronWeb.address.fromHex(DomainRecords.address)
  );
  console.log(TronWeb.address.fromHex(TldFactory.address));
};
