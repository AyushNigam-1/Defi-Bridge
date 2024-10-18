import { getDeployedTestAccountsWallets } from '@aztec/accounts/testing';
import { createDebugLogger, createPXEClient, waitForPXE } from '@aztec/aztec.js';
import { TokenContract } from '@aztec/noir-contracts.js/Token';
import { TokenBridgeContract } from './artifacts/TokenBridge.js';
import { format } from 'util';
import fs from 'fs';
import dotenv from 'dotenv';

// Load existing .env file
dotenv.config();
const { PXE_URL = 'http://localhost:8080' } = process.env;

async function updateEnv(key, value) {
    const envVars = fs.readFileSync('.env', 'utf8').split('\n');
    const newEnvVars = envVars.map(line =>
        line.startsWith(key) ? `${key}=${value}` : line
    );

    // If the key doesn't exist, add it
    if (!newEnvVars.find(line => line.startsWith(key))) {
        newEnvVars.push(`${key}=${value}`);
    }

    fs.writeFileSync('.env', newEnvVars.join('\n'));
}

async function main() {
    const logger = createDebugLogger('token');
    const pxe = createPXEClient(PXE_URL);
    await waitForPXE(pxe, logger);

    const nodeInfo = await pxe.getNodeInfo();
    logger.info(format('Aztec Sandbox Info', nodeInfo));

    const accounts = await getDeployedTestAccountsWallets(pxe);
    const adminWallet = accounts[0];
    const johnWallet = accounts[1];
    const admin = adminWallet.getAddress();

    logger.info(`Deploying token contract...`);
    const tokenContract = await TokenContract.deploy(adminWallet, admin, 'FATHOM', 'FTH', 18)
        .send()
        .deployed();
    console.log(`Token Contract deployed at ${tokenContract.address.toShortString()}`);

    const bridgeContract = await TokenBridgeContract.deploy(adminWallet, tokenContract.address)
        .send()
        .deployed();
    console.log(`Token Bridge Contract deployed at ${bridgeContract.address.toShortString()}`);

    await updateEnv('AZTEC_TOKEN_CONTRACT_ADDRESS', tokenContract.address.toString());
    await updateEnv('AZTEC_BRIDGE_CONTRACT_ADDRESS', bridgeContract.address.toString());

    console.log(`.env file updated with contract addresses`);

    await tokenContract.methods.set_minter(bridgeContract.address, true).send({ from: adminWallet });
    await tokenContract.methods.set_admin(bridgeContract.address, true).send({ from: adminWallet });
    await tokenContract.methods.set_minter(adminWallet.getAddress(), true).send({ from: adminWallet });
    await tokenContract.methods.set_admin(adminWallet.getAddress(), true).send({ from: adminWallet });
    await tokenContract.methods.set_minter(adminWallet.getAddress(), true).send({ from: johnWallet });
    await tokenContract.methods.set_admin(adminWallet.getAddress(), true).send({ from: johnWallet });

    console.log(`Token Bridge Minter Set`);
}

main().catch(error => {
    console.error('Error deploying contracts:', error);
    process.exit(1);
});
