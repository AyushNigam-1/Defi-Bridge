import { getDeployedTestAccountsWallets } from '@aztec/accounts/testing';
import { createDebugLogger, createPXEClient, waitForPXE, } from '@aztec/aztec.js';
import { TokenContract } from '@aztec/noir-contracts.js/Token';
import { TokenBridgeContract } from './artifacts/TokenBridge.js';
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
    const johnWallet = accounts[1];

    const admin = adminWallet.getAddress();
    logger.info(`Deploying token contract...`);
    // Deploy the contract and set Alice as the admin while doing so
    const tokenContract = await TokenContract.deploy(adminWallet, admin, 'FATHOM', 'FTH', 18).send().deployed();
    console.log(`Token Contract successfully deployed at address ${tokenContract.address.toShortString()}`)
    const bridgeContract = await TokenBridgeContract.deploy(adminWallet, tokenContract.address).send().deployed();
    console.log(`Token Bridge Contract successfully deployed at address ${bridgeContract.address.toShortString()}`)
    await tokenContract.methods.set_minter(bridgeContract.address, true).send({ from: adminWallet })
    await tokenContract.methods.set_admin(bridgeContract.address, true).send({ from: adminWallet })
    await tokenContract.methods.set_minter(adminWallet.getAddress(), true).send({ from: adminWallet })
    await tokenContract.methods.set_admin(adminWallet.getAddress(), true).send({ from: adminWallet })
    await tokenContract.methods.set_minter(adminWallet.getAddress(), true).send({ from: johnWallet })
    await tokenContract.methods.set_admin(adminWallet.getAddress(), true).send({ from: johnWallet })


    console.log(`Token Bridge Minter Set`);
}
main();