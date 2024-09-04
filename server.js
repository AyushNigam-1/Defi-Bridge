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

const BridgeABI = (await import('./artifacts/contracts/Bridge.sol/Bridge.json', { with: { type: 'json' } })).default;

const TokenABI = (await import('./artifacts/contracts/Token.sol/Token.json', { with: { type: 'json' } })).default;

const bridgeContract = new ethers.Contract(process.env.BRIDGE_CONTRACT_ADDRESS, BridgeABI.abi, wallet1);

const tokenContract = new ethers.Contract(process.env.BRIDGE_TOKEN_CONTRACT_ADDRESS, TokenABI.abi, wallet1);

const aztecTokenContract = await TokenContract.at(AztecAddress.fromString(process.env.AZTEC_TOKEN_CONTRACT_ADDRESS), aliceWallet);

const aztecBridgeContract = await Contract.at(AztecAddress.fromString(process.env.AZTEC_BRIDGE_CONTRACT_ADDRESS), TokenBridgeContractArtifact, aliceWallet)

 const getToken = (client) => {
    return ;
  }

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


app.get('/balance/:address', async (req, res) => {
    try {
        const balance1 = await bridgeContract.balance(wallet1.address);
        const balance2 = await bridgeContract.balance(wallet2.address);
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
        let sender = aliceWallet.getAddress().toString().includes(from) ? aliceWallet.getAddress().toString() : johnWallet.getAddress().toString()
        try {
            const aztecBurn = await aztecTokenContract.methods.burn_public(sender, ethers.parseUnits(amount.toString(), 18), 0).send({ from: aliceWallet })
            await aztecBurn.wait()
            const xdcMint = await bridgeContract.mint(
                to,
                ethers.parseUnits(amount.toString(), 18),
            )
            await xdcMint.wait();
            const aztecAccountBalance = await aztecTokenContract.methods.balance_of_public(from).simulate()
            const balance = await bridgeContract.balance(to);
            res.status(200).send({ message: 'Tokens sent successfully', balance: ethers.formatUnits(balance, 18), aztecAccountBalance: ethers.formatUnits(aztecAccountBalance.toString(), 18) });
        } catch (error) {
            console.error(" this -->", error);
            res.status(500).send({ error: error.message });
        }
    }
    else {
        let reciever = aliceWallet.getAddress().toString().includes(to) ? aliceWallet.getAddress().toString() : johnWallet.getAddress().toString()
        try {
            const burnToken = await bridgeContract.burn(
                reciever,
                ethers.parseUnits(amount.toString(), 18)
            );
            await burnToken.wait();
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: error.message });
        }
        await new Promise((resolve, reject) => {
            bridgeContract.once('onBurn', async (from, to, amount, date) => {
                console.log(from, to, amount, date);
                try {
                    const aztecMint = await aztecBridgeContract.methods.claim_public(
                        to,
                        amount.toString(),
                        0
                    ).send({ from: aliceWallet });
                    await aztecMint.wait();
                    resolve();
                } catch (error) {
                    reject(error);
                }
            });
        });
        const balance = await bridgeContract.balance(from);
        const aztecAccountBalance = await aztecTokenContract.methods.balance_of_public(to).simulate();
        console.log(balance, aztecAccountBalance);
        res.status(200).send({
            message: 'Tokens sent successfully',
            balance: ethers.formatUnits(balance, 18),
            aztecAccountBalance: ethers.formatUnits(aztecAccountBalance.toString(), 18)
        });
    }
});

app.post('/xdc-transfer', async (req, res) => {
    const { to, from, amount } = req.body;

    try {
        const tx = await tokenContract.transfer(
            from,
            to,
            ethers.parseUnits(amount.toString(), 18),
        );
        await tx.wait();
        const balance1 = await tokenContract.balanceOf(wallet1.address);
        const balance2 = await tokenContract.balanceOf(wallet2.address);
        res.status(200).send({ message: 'Tokens received and minted successfully', balance1: ethers.formatUnits(balance1, 18), balance2: ethers.formatUnits(balance2, 18) });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});
app.post('/aztec-transfer', async (req, res) => {
    const { to, from, amount } = req.body;
    let client = aliceWallet.getAddress().toString().includes(from) ? aliceWallet : johnWallet
    const token = await TokenContract.at(AztecAddress.fromString(process.env.AZTEC_TOKEN_CONTRACT_ADDRESS), client)
    try {
        const tx = token.methods.transfer_public(
            from,
            to,
            ethers.parseUnits(amount.toString(), 18),
            0
        ).send();
        await tx.wait();
        const aztecAccountBalance = await aztecTokenContract.methods.balance_of_public(aztecAccountAddress).simulate()
        const aztecAccountBalance2 = await aztecTokenContract.methods.balance_of_public(aztecAccountAddress2).simulate()
        res.status(200).send({ message: 'Tokens received and minted successfully', aztecAccountBalance: ethers.formatUnits(aztecAccountBalance, 18), aztecAccountBalance2: ethers.formatUnits(aztecAccountBalance2, 18) });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
