import 'dotenv/config'; // Use import for dotenv in ES modules
import express from 'express';
import cors from 'cors';
import { ethers, toBigInt } from 'ethers';
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
import { get } from 'http';
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

function serializeFr(fr) {
    // Ensure `fr` is handled as a string or buffer
    if (typeof fr.toString === 'function') {
        return Buffer.from(fr.toString('hex'), 'hex');
    } else {
        throw new TypeError('Fr object must have a toString method returning hex format');
    }
}

function serializeBuffer(buffer) {
    // console.log(buffer)
    if (Buffer.isBuffer(buffer)) {
        return buffer;
    } else if (Array.isArray(buffer)) {
        return Buffer.concat(buffer.map(serializeBuffer));
    } else if (ArrayBuffer.isView(buffer)) {
        return Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    } else if (typeof buffer === 'string') {
        return Buffer.from(buffer, 'hex');
    } else if (typeof buffer === 'object' && buffer.constructor.name === 'Fr') {
        return Buffer.from(buffer.toString('hex'), 'hex');
    } else {
        throw new TypeError('Expected buffer to be a Buffer, array, ArrayBuffer view, hex string, or Fr object');
    }
}

function serializePublicDataWrite(publicDataWrite) {
    if (!publicDataWrite || typeof publicDataWrite !== 'object') {
        throw new TypeError('Expected publicDataWrite to be an object');
    }
    const leafIndexBuffer = serializeFr(publicDataWrite.leafIndex);
    const newValueBuffer = serializeFr(publicDataWrite.newValue);

    return Buffer.concat([leafIndexBuffer, newValueBuffer]);
}
function getSerializedBlockSize(block) {
    let size = 0;

    // Serialize header fields (Fr, Buffers, etc.)
    size += serializeFr(block.header.lastArchive.root).length;
    size += serializeFr(block.header.contentCommitment.numTxs).length;
    size += serializeBuffer(block.header.contentCommitment.txsEffectsHash).length;
    size += serializeBuffer(block.header.contentCommitment.inHash).length;
    size += serializeBuffer(block.header.contentCommitment.outHash).length;
    size += serializeFr(block.header.globalVariables.chainId).length;
    size += serializeFr(block.header.globalVariables.blockNumber).length;

    // Serialize body fields (transaction data)
    block.body.txEffects.forEach(txEffect => {
        size += serializeFr(txEffect.transactionFee).length;

        // Serialize nullifiers (assumed to be `Fr` objects)
        txEffect.nullifiers.forEach(nullifier => {
            size += serializeFr(nullifier).length;
        });

        // Serialize public data writes
        txEffect.publicDataWrites.forEach(write => {
            size += serializePublicDataWrite(write).length;
        });
    });

    return size;
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
        const startTime = performance.now()
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
            const endTime = performance.now()
            const timeTaken = endTime - startTime;
            res.status(200).send({ message: 'Tokens sent successfully', balance: ethers.formatUnits(balance, 18), aztecAccountBalance: ethers.formatUnits(aztecAccountBalance.toString(), 18), timeTaken });
        } catch (error) {
            console.error(" this -->", error);
            res.status(500).send({ error: error.message });
        }
    }
    else {
        const startTime = performance.now()
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
                        amount,
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
        const endTime = performance.now()
        const timeTaken = endTime - startTime;
        console.log(balance, aztecAccountBalance);
        res.status(200).send({
            message: 'Tokens sent successfully',
            balance: ethers.formatUnits(balance, 18),
            aztecAccountBalance: ethers.formatUnits(aztecAccountBalance.toString(), 18),
            timeTaken
        });
    }
});

app.post('/xdc-transfer', async (req, res) => {
    const { to, from, amount } = req.body;
    const startTime = performance.now()
    try {
        const tx = await tokenContract.transfer(
            from,
            to,
            ethers.parseUnits(amount.toString(), 18),
        );
        const receipt = await tx.wait();
        const block = await provider.send('eth_getBlockByNumber', [ethers.toBeHex(receipt.blockNumber), false]);
        const gasUsed = BigInt(21000);
        const gasPrice = BigInt(20000000000);
        const transactionFee = gasUsed * gasPrice;
        const transactionFeeInEther = ethers.formatUnits(transactionFee, "ether");
        console.log(parseInt(block.size, 16))
        const blockSize = ((parseInt(block.size, 16)) / 1024)
        const balance1 = await tokenContract.balanceOf(wallet1.address);
        const balance2 = await tokenContract.balanceOf(wallet2.address);
        const endTime = performance.now()
        const timeTaken = endTime - startTime;
        res.status(200).send({
            message: 'Tokens received and minted successfully', balance1: ethers.formatUnits(balance1, 18), balance2: ethers.formatUnits(balance2, 18), timeTaken: timeTaken.toFixed(2),
            transactionFee: transactionFeeInEther,
            blockSize: blockSize.toFixed(2)
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});
app.post('/aztec-transfer', async (req, res) => {
    const startTime = performance.now()
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
        const receipt = await tx.wait();
        console.log(receipt)
        const block = await client.getBlock(receipt.blockNumber)
        const blockSize = getSerializedBlockSize(block)
        console.log(blockSize)
        const { transactionFee } = receipt;
        const transactionFeeInEther = ethers.formatUnits(BigInt(transactionFee), "ether")
        const aztecAccountBalance = await aztecTokenContract.methods.balance_of_public(aztecAccountAddress).simulate()
        const aztecAccountBalance2 = await aztecTokenContract.methods.balance_of_public(aztecAccountAddress2).simulate()
        const endTime = performance.now()
        const timeTaken = endTime - startTime;

        res.status(200).send({
            message: 'Tokens received and minted successfully', aztecAccountBalance: ethers.formatUnits(aztecAccountBalance, 18), aztecAccountBalance2: ethers.formatUnits(aztecAccountBalance2, 18), timeTaken: timeTaken.toFixed(2),
            transactionFee: transactionFeeInEther, blockSize: blockSize.toFixed(2)
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});


const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
