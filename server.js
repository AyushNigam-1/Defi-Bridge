import 'dotenv/config'; // Use import for dotenv in ES modules
import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import { getSchnorrAccount } from '@aztec/accounts/schnorr';
import { getDeployedTestAccountsWallets } from '@aztec/accounts/testing';
import {
    AztecAddress,
    Contract,
    createPXEClient,
    waitForPXE,
    loadContractArtifact,
    Fr
} from '@aztec/aztec.js';
import crypto from "crypto"
import { TokenContract } from '@aztec/noir-contracts.js/Token';
import TokenBridgeContractArtifactJson from './target/token_contract-TokenBridge.json' with { type: 'json' };
export const TokenBridgeContractArtifact = loadContractArtifact(TokenBridgeContractArtifactJson);
const app = express();
app.use(cors());
app.use(express.json());

const PXE_URL = process.env.PXE_URL || 'http://localhost:8080';

const pxe = createPXEClient(PXE_URL);

await waitForPXE(pxe);

const nodeInfo = await pxe.getNodeInfo();
const accounts = await getDeployedTestAccountsWallets(pxe);

const aliceWallet = accounts[0];
const johnWallet = accounts[1];
const aztecAccountAddress = aliceWallet.getAddress();
const aztecAccountAddress2 = johnWallet.getAddress();

const provider = new ethers.JsonRpcProvider(process.env.HARDHAT_NODE_URL);
const wallet1 = new ethers.Wallet(process.env.PRIVATE_KEY_1, provider);
const wallet2 = new ethers.Wallet(process.env.PRIVATE_KEY_2, provider);

const bridgeABI = (await import('./artifacts/contracts/Bridge.sol/Bridge.json', { with: { type: 'json' } })).default;
const bridgeTokenABI = (await import('./artifacts/contracts/BridgeToken.sol/BridgeToken.json', { with: { type: 'json' } })).default;

const bridgeContract = new ethers.Contract(process.env.BRIDGE_CONTRACT_ADDRESS, bridgeABI.abi, wallet1);
const bridgeTokenContract = new ethers.Contract(process.env.BRIDGE_TOKEN_CONTRACT_ADDRESS, bridgeTokenABI.abi, wallet1);
const aztecTokenContract = await TokenContract.at(AztecAddress.fromString(process.env.AZTEC_TOKEN_CONTRACT_ADDRESS), aliceWallet);
const aztecBridgeTokenContract = await Contract.at(AztecAddress.fromString(process.env.AZTEC_BRIDGE_CONTRACT_ADDRESS), TokenBridgeContractArtifact, aliceWallet)
app.get('/account-address', async (req, res) => {
    try {
        const address = wallet1.address;
        const address2 = wallet2.address;
        res.status(200).send({ xdcAccountAddress: address, xdcAccountAddress2: address2, aztecAccountAddress, aztecAccountAddress2 });
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
    try {
        const balance1 = await bridgeTokenContract.balanceOf(wallet1.address);
        const balance2 = await bridgeTokenContract.balanceOf(wallet2.address);
        const aztecAccountBalance = await aztecTokenContract.methods.balance_of_public(aztecAccountAddress).simulate()
        const aztecAccountBalance2 = await aztecTokenContract.methods.balance_of_public(aztecAccountAddress2).simulate()

        res.status(200).send({ balance1: ethers.formatUnits(balance1, 18), balance2: ethers.formatUnits(balance2, 18), aztecAccountBalance: ethers.formatUnits(aztecAccountBalance.toString(), 18), aztecAccountBalance2: ethers.formatUnits(aztecAccountBalance2.toString(), 18) });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});

app.post('/bridge-send', async (req, res) => {
    const { amount, to, token, from } = req.body;
    if (token == 'WFTH') {
        try {
            const aztecBurn = await aztecTokenContract.methods.burn_public(aliceWallet.getAddress(), ethers.parseUnits(amount.toString(), 18), 0).send({ from: aliceWallet })
            await aztecBurn.wait()
            const xdcMint = await bridgeContract.bridgeReceive(process.env.BRIDGE_TOKEN_CONTRACT_ADDRESS,
                ethers.parseUnits(amount.toString(), 18),
                to)
            await xdcMint.wait();
            const aztecAccountBalance = await aztecTokenContract.methods.balance_of_public(from).simulate()
            const balance = await bridgeTokenContract.balanceOf(to);
            res.status(200).send({ message: 'Tokens sent successfully', balance: ethers.formatUnits(balance, 18), aztecAccountBalance: ethers.formatUnits(aztecAccountBalance.toString(), 18) });
        } catch (error) {
            console.error(" this -->", error);
            res.status(500).send({ error: error.message });
        }
    }
    else {
        let acc = aliceWallet.getAddress().toString().includes(to) ? aliceWallet.getAddress() : johnWallet.getAddress()
        console.log(acc)
        try {
            const xdcBurn = await bridgeContract.bridgeSend(
                process.env.BRIDGE_TOKEN_CONTRACT_ADDRESS,
                ethers.parseUnits(amount.toString(), 18),
                to
            );
            await xdcBurn.wait()
            const aztecMint = await aztecBridgeTokenContract.methods.claim_public(to, ethers.parseUnits(amount.toString(), 18), 0).send({ from: aliceWallet });
            await aztecMint.wait()
            const balance = await bridgeTokenContract.balanceOf(from);
            const aztecAccountBalance = await aztecTokenContract.methods.balance_of_public(to).simulate()
            console.log(balance, aztecAccountBalance)
            res.status(200).send({ message: 'Tokens sent successfully', balance: ethers.formatUnits(balance, 18), aztecAccountBalance: ethers.formatUnits(aztecAccountBalance.toString(), 18) });
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: error.message });
        }
    }

});

app.post('/xdc-transfer', async (req, res) => {
    const { tokenAddress, to, from, amount } = req.body;
    try {
        const tx = await bridgeTokenContract.transfer(
            tokenAddress,
            from,
            ethers.parseUnits(amount.toString(), 18),
            to
        );
        await tx.wait();
        const balance1 = await bridgeTokenContract.balanceOf(wallet1.address);
        const balance2 = await bridgeTokenContract.balanceOf(wallet2.address);
        res.status(200).send({ message: 'Tokens received and minted successfully', balance1, balance2 });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});
app.post('/aztec-transfer', async (req, res) => {
    const { to, from, amount } = req.body;
    try {
        const tx = await aztecTokenContract.methods.transfer_public(
            from,
            to,
            ethers.parseUnits(amount.toString(), 18),
            0
        );
        await tx.wait();
        const aztecAccountBalance = await aztecTokenContract.methods.balance_of_public(aztecAccountAddress).simulate()
        const aztecAccountBalance2 = await aztecTokenContract.methods.balance_of_public(aztecAccountAddress2).simulate()
        res.status(200).send({ message: 'Tokens received and minted successfully', aztecAccountBalance, aztecAccountBalance2 });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
