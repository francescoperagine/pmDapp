// const ThesisLib = artifacts.require("ThesisLib");
const OwnedUpgradeabilityProxy = artifacts.require("OwnedUpgradeabilityProxy");
const ManagementConsole = artifacts.require("ManagementConsole");

module.exports = async function(deployer) {
  // await deployer.deploy(ThesisLib);
  await deployer.deploy(OwnedUpgradeabilityProxy);
  await deployer.deploy(ManagementConsole);

  // deployer.link(ThesisLib, ManagementConsole);
  managementConsole = await ManagementConsole.deployed();

  ownedUpgradeabilityProxy = await OwnedUpgradeabilityProxy.deployed();
  ownedUpgradeabilityProxy.upgradeTo(managementConsole.address);
}