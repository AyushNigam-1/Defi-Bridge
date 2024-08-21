const { getSchnorrAccount } = require('@aztec/accounts/schnorr');
const { getDeployedTestAccountsWallets } = require('@aztec/accounts/testing');
const {
  ExtendedNote,
  Fr,
  GrumpkinScalar,
  Note,
  computeSecretHash,
  createDebugLogger,
  createPXEClient,
  waitForPXE,
} = require('@aztec/aztec.js');
const { TokenContract } = require('@aztec/noir-contracts.js/Token');

// import { format } from 'util';

const { PXE_URL = 'http://localhost:8080' } = process.env;

export async function getAccount() {
  const pxe = createPXEClient(PXE_URL);

  await waitForPXE(pxe);

  const nodeInfo = await pxe.getNodeInfo();

  const accounts = await getDeployedTestAccountsWallets(pxe);

  const aliceWallet = accounts[0];
  const alice = aliceWallet.getAddress();

  console.log(`Loaded alice's account at ${alice.toShortString()}`);

  return aliceWallet;
}

// Example usage of the function
// async function main() {
//   const aliceWallet = await getAccount();
//   const tokenContractAlice = await TokenContract.at(process.env.AZTEC_TOKEN_CONTRACT_ADDRESS, aliceWallet);

//   // Additional logic can go here
// }

// main();

// Export the function for use in other modules
module.exports = { getAccount };
