import { getSchnorrAccount } from '@aztec/accounts/schnorr';
import { getDeployedTestAccountsWallets } from '@aztec/accounts/testing';
import {
  ExtendedNote,
  Fr,
  GrumpkinScalar,
  Note,
  type PXE,
  computeSecretHash,
  createDebugLogger,
  createPXEClient,
  waitForPXE,
} from '@aztec/aztec.js';
import { TokenContract } from '@aztec/noir-contracts.js/Token';
import {TokenBridgeContract} from './artifacts/TokenBridge.js'
import { format } from 'util';

const { PXE_URL = 'http://localhost:8080' } = process.env;

async function main() {

const logger = createDebugLogger('token');

const pxe = createPXEClient(PXE_URL);

await waitForPXE(pxe, logger);

const nodeInfo = await pxe.getNodeInfo();

logger.info(format('Aztec Sandbox Info ', nodeInfo));
 
const accounts = await getDeployedTestAccountsWallets(pxe);

const adminWallet = accounts[0];

const admin = adminWallet.getAddress();

logger.info(`Deploying token contract...`);

// Deploy the contract and set Alice as the admin while doing so
const tokenContract = await TokenContract.deploy(adminWallet, admin, 'FATHOM', 'FTH', 18).send().deployed();

logger.info(`Token Contract successfully deployed at address ${tokenContract.address.toShortString()}`);

const bridgeContract = await TokenBridgeContract.deploy(adminWallet,tokenContract.address).send().deployed();

logger.info(`Token Bridge Contract successfully deployed at address ${bridgeContract.address.toShortString()}`);

}



main();