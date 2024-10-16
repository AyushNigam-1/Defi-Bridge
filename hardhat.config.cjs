require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition");
require("hardhat-deploy");

module.exports = {
  solidity: "0.8.14",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545",
      accounts: ["0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"],
    },
  },
  tasks: {
    async printNetworkName(args, hardhatArguments) {
      console.log(await hardhatArguments.network.getNetworkName());
    },
    async deployToken() {
      const { deployments, ethers } = require("hardhat");
      const { deploy } = deployments;
      const Token = await ethers.getContractFactory("Token");
      const token = await deploy("Token", {
        from: (await ethers.getSigners())[0].address,
        log: true,
      });

      console.log("Token deployed to:", token.address);
    },
  },
};
