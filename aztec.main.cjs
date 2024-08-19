// const { getSchnorrAccount } =  require('@aztec/accounts/schnorr');
// const { getDeployedTestAccountsWallets } = require('@aztec/accounts/testing');
// const {
//   ExtendedNote,
//   Fr,
//   GrumpkinScalar,
//   Note,
//   computeSecretHash,
//   createDebugLogger,
//   createPXEClient,
//   waitForPXE,
// } =  require('@aztec/aztec.js');
// const{ TokenContract } = require('@aztec/noir-contracts.js/Token');

// // import { format } from 'util';

// const { PXE_URL = 'http://localhost:8080' } = process.env;

// async function main() {
// console.log("working")
// // const pxe = createPXEClient(PXE_URL);

// // await waitForPXE(pxe);

// // const nodeInfo = await pxe.getNodeInfo();
 
// // const accounts = await getDeployedTestAccountsWallets(pxe);

// // const aliceWallet = accounts[0];

// // const bobWallet = accounts[1];

// // const alice = aliceWallet.getAddress();

// // const bob = bobWallet.getAddress();

// // console.log(`Loaded alice's account at ${alice.toShortString()}`);
// // console.log(`Loaded bob's account at ${bob.toShortString()}`);
// // const tokenContractAlice = await TokenContract.at(process.env.AZTEC_TOKEN_CONTRACT_ADDRES, aliceWallet);
 
// // exports.currentAztecAccount = () => alice 

// }

// main();