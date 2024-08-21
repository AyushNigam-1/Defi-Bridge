import 'dotenv/config'; // Use import for dotenv in ES modules
import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import { getSchnorrAccount } from '@aztec/accounts/schnorr';
import { getDeployedTestAccountsWallets } from '@aztec/accounts/testing';
import {
    AztecAddress,
    Contract,
  ExtendedNote,
  Fr,
  GrumpkinScalar,
  Note,
  computeSecretHash,
  createDebugLogger,
  createPXEClient,
  waitForPXE,
} from '@aztec/aztec.js';
import { TokenContract } from '@aztec/noir-contracts.js/Token';
// import {TokenBridgeContract} from "./src/artifacts/TokenBridge";
const app = express();
app.use(cors());
app.use(express.json());

const PXE_URL = process.env.PXE_URL || 'http://localhost:8080';

const pxe = createPXEClient(PXE_URL);

await waitForPXE(pxe);

const nodeInfo = await pxe.getNodeInfo();
const accounts = await getDeployedTestAccountsWallets(pxe);

const aliceWallet = accounts[0];
const aztecAccountAddress= aliceWallet.getAddress();

const provider = new ethers.JsonRpcProvider(process.env.HARDHAT_NODE_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const bridgeABI = (await import('./artifacts/contracts/Bridge.sol/Bridge.json' , {with : {type:'json'}}) ).default;
const bridgeTokenABI = (await import('./artifacts/contracts/BridgeToken.sol/BridgeToken.json', {with : {type:'json'}})).default;

const bridgeContract = new ethers.Contract(process.env.BRIDGE_CONTRACT_ADDRESS, bridgeABI.abi, wallet);
const bridgeTokenContract = new ethers.Contract(process.env.BRIDGE_TOKEN_CONTRACT_ADDRESS, bridgeTokenABI.abi, wallet);
const aztecTokenContract = await TokenContract.at(AztecAddress.fromString(process.env.AZTEC_TOKEN_CONTRACT_ADDRESS), aliceWallet);
// const aztecBridgeTokenContract = await TokenBridgeContract.at(AztecAddress.fromString(process.env.AZTEC_BRIDGE_CONTRACT_ADDRESS ),aliceWallet )
app.get('/account-address', async (req, res) => {
    try {
        const address = wallet.address;
        res.status(200).send({ xdcAccountAddress: address, aztecAccountAddress: aztecAccountAddress });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});

app.post('/set-max-supply', async (req, res) => {
    const { amount } = req.body;
    try {
        const tx = await bridgeTokenContract.setMaxSupply(amount);
        await tx.wait();
        res.status(200).send({ message: 'Max supply set successfully', transactionHash: tx.hash });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});

app.post('/burn-tokens', async (req, res) => {
    const { from, amount } = req.body;
    try {
        const tx = await bridgeTokenContract.ownerBurn(from, ethers.parseUnits(amount, 18));
        await tx.wait();
        res.status(200).send({ message: 'Tokens burned successfully', transactionHash: tx.hash });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});

app.post('/send-tokens', async (req, res) => {
    const { tokenAddress, amount, to } = req.body;
    try {
        const tx = await bridgeContract.bridgeSend(tokenAddress, ethers.parseUnits(amount, 18), to);
        await tx.wait();
        res.status(200).send({ message: 'Tokens sent successfully', transactionHash: tx.hash });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});

app.post('/mint-tokens', async (req, res) => {
    const { to, amount } = req.body;
    try {
        const tx = await bridgeTokenContract.ownerMint(to, ethers.parseUnits(amount, 18));
        await tx.wait();
        res.status(200).send({ message: 'Tokens minted successfully', transactionHash: tx.hash });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});

app.get('/balance/:address', async (req, res) => {
    const address = req.params.address;
    try {
        const balance = await bridgeTokenContract.balanceOf(address);
        const aztecAccountBalance = await aztecTokenContract.methods.balance_of_public(aztecAccountAddress).simulate()
        // await aztecBridgeTokenContract
        console.log(aztecAccountBalance)
        res.status(200).send({ balance: ethers.formatUnits(balance, 18),aztecAccountBalance:aztecAccountBalance.toString() });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});

app.post('/bridge-send', async (req, res) => {
    const { tokenAddress, amount, to } = req.body;
    try {
        const tx = await bridgeContract.bridgeSend(
            tokenAddress,
            ethers.parseUnits(amount.toString(), 18),
            to
        );
        await tx.wait();
        res.status(200).send({ message: 'Tokens sent successfully', transactionHash: tx.hash });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});

app.post('/bridge-receive', async (req, res) => {
    const { tokenAddress, amount, to } = req.body;
    try {
        const tx = await bridgeContract.bridgeReceive(
            tokenAddress,
            ethers.parseUnits(amount.toString(), 18),
            to
        );
        await tx.wait();
        res.status(200).send({ message: 'Tokens received and minted successfully', transactionHash: tx.hash });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});

bridgeContract.on('TokenSent', (from, to, value, event) => {
    console.log(`Transfer event detected:
        From: ${from}
        To: ${to}
        Value: ${ethers.formatUnits(value, 18)}
        Transaction Hash: ${event.transactionHash}`);
});

bridgeContract.on('TokenReceived', (from, value, event) => {
    console.log(`Burn event detected:
        From: ${from}
        Value: ${ethers.formatUnits(value, 18)}
        Transaction Hash: ${event.transactionHash}`);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
