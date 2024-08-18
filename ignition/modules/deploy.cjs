const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("DeploymentModule", (m) => {
  const token = m.contract("BridgeToken");
  const bridge = m.contract("Bridge", [token]);

  return { token, bridge };
});
