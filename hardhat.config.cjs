require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-ignition");
require("hardhat-deploy");
require('dotenv').config();
const fs = require('fs');
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
      url: "http://127.0.0.1:8546",
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

task("deploy", "Deploys the Token and Bridge contracts")
  .setAction(async (taskArgs, hre) => {
    const { ethers, deployments } = hre;
    const { deploy } = deployments;
    const deployer = (await ethers.getSigners())[0];

    console.log(`Deploying with account: ${deployer.address}`);

    const tokenDeployment = await deploy("Token", {
      from: deployer.address,
      args: [],
      log: true,
    });

    console.log("Token deployed to:", tokenDeployment.address);

    const bridgeDeployment = await deploy("Bridge", {
      from: deployer.address,
      args: [tokenDeployment.address],
      log: true,
    });

    console.log("Bridge deployed to:", bridgeDeployment.address);
    updateEnvFile('BRIDGE_TOKEN_CONTRACT_ADDRESS', tokenDeployment.address);
    updateEnvFile('BRIDGE_CONTRACT_ADDRESS', bridgeDeployment.address);
  });

function updateEnvFile(key, value) {
  const envFile = '.env';
  let envVars = fs.readFileSync(envFile, 'utf8').split('\n');

  const newEnvVars = envVars.map((line) =>
    line.startsWith(`${key}=`) ? `${key}=${value}` : line
  );

  if (!newEnvVars.some(line => line.startsWith(`${key}=`))) {
    newEnvVars.push(`${key}=${value}`);
  }

  fs.writeFileSync(envFile, newEnvVars.join('\n'), 'utf8');
  console.log(`Updated ${key} in .env with value: ${value}`);
}