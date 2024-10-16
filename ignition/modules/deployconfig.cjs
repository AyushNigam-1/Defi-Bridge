const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("DeploymentModule", (m) => {
  const token = m.contract("Token");
  const bridge = m.contract("Bridge", [token]);

  return {
    token: {
      address: token.address,
      name: "Token",
    },
    bridge: {
      address: bridge.address,
      name: "Bridge",
    },
  };
});
