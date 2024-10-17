require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition");
require("hardhat-deploy");

const { task } = require("hardhat/config");

module.exports = {
  solidity: "0.8.14",
  namedAccounts: {
    deployer: {
      default: 0,
    },
  },
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: [
        "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
      ],
    },
  },
};

task("print-network", "Prints the current network name").setAction(
  async (_, hre) => {
    console.log(`Network: ${hre.network.name}`);
  }
);

task("deploy-token", "Deploys the Token contract").setAction(async (taskArgs, hre) => {
  const { ethers, deployments } = hre;
  const { deploy } = deployments;

  const deployer = (await ethers.getSigners())[0];

  console.log(`Deploying with account: ${deployer.address}`);

  const token = await deploy("Token", {
    from: deployer.address,
    args: [],
    log: true,
  });

  console.log("Token deployed to:", token.address);
});
