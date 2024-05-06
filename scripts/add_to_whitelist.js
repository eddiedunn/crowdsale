const hre = require("hardhat");

async function main() {
  const CROWDSALE_ADDRESS = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
  const ADDRESS_TO_WHITELIST = '0x90F79bf6EB2c4f870365E785982E1f101E93b906';

  // Connect to the already deployed Crowdsale contract
  const Crowdsale = await hre.ethers.getContractAt("Crowdsale", CROWDSALE_ADDRESS);

  // Add an address to the whitelist
  const addToWhitelistTx = await Crowdsale.addToWhiteList(ADDRESS_TO_WHITELIST);
  await addToWhitelistTx.wait();

  console.log(`Address ${ADDRESS_TO_WHITELIST} added to whitelist`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});