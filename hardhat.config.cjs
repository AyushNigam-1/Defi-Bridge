require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.14",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8546", // URL for the local blockchain (default Hardhat network)
      accounts: ["0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"], // Replace with your local private key if needed
    },
    apothem: {
      url: "https://rpc.apothem.network", // XDC Apothem testnet RPC URL
      accounts: ["fed209a85a3939305e153c6b3a43df371cc82519273ceeadba976c94a8b6c181"], // Use your private key securely from .env
      chainId: 51, // XDC Apothem testnet chain ID
    },
  },
};
