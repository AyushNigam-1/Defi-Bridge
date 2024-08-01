require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.14",
  networks: {
    apothem: {
      url: "https://rpc.apothem.network",
      accounts: ["ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"], // Replace with your MetaMask private key
    },
  },
};
