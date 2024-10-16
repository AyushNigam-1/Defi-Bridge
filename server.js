import 'dotenv/config'; // Use import for dotenv in ES modules
import express from 'express';
import cors from 'cors';
import { ethers } from 'ethers';
import { getDeployedTestAccountsWallets } from '@aztec/accounts/testing';
import {
    AztecAddress,
    Contract,
    createPXEClient,
    waitForPXE,
    loadContractArtifact,
    Fr
} from '@aztec/aztec.js';
import { TokenContract } from '@aztec/noir-contracts.js/Token';
import TokenBridgeContractArtifactJson from './target/token_contract-TokenBridge.json' with { type: 'json' };
import axios from 'axios';
export const TokenBridgeContractArtifact = loadContractArtifact(TokenBridgeContractArtifactJson);
const app = express();
app.use(cors());
app.use(express.json());

const PXE_URL = process.env.PXE_URL || 'http://localhost:8080';

const pxe = createPXEClient(PXE_URL);

await waitForPXE(pxe);

const accounts = await getDeployedTestAccountsWallets(pxe);

const aliceWallet = accounts[0];
const johnWallet = accounts[1];
const aztecAccountAddress = aliceWallet.getAddress();
const aztecAccountAddress2 = johnWallet.getAddress();

const provider = new ethers.JsonRpcProvider(process.env.XDC_RPC_URL);
const wallet1 = new ethers.Wallet(process.env.PRIVATE_KEY_1, provider);
const wallet2 = new ethers.Wallet(process.env.PRIVATE_KEY_2, provider);

const BridgeABI = (await import('./artifacts/contracts/Bridge.sol/Bridge.json', { with: { type: 'json' } })).default;

const TokenABI = (await import('./artifacts/contracts/Token.sol/Token.json', { with: { type: 'json' } })).default;

const bridgeContract = new ethers.Contract(process.env.BRIDGE_CONTRACT_ADDRESS, BridgeABI.abi, wallet1);

const tokenContract = new ethers.Contract(process.env.BRIDGE_TOKEN_CONTRACT_ADDRESS, TokenABI.abi, wallet1);

const aztecTokenContract = await TokenContract.at(AztecAddress.fromString(process.env.AZTEC_TOKEN_CONTRACT_ADDRESS), aliceWallet);

const aztecBridgeContract = await Contract.at(AztecAddress.fromString(process.env.AZTEC_BRIDGE_CONTRACT_ADDRESS), TokenBridgeContractArtifact, aliceWallet)

function serializeFr(fr) {
    return Buffer.from(fr.toString('hex'), 'hex');
}

function serializeBuffer(buffer) {
    if (Buffer.isBuffer(buffer)) return buffer;
    else if (Array.isArray(buffer)) return Buffer.concat(buffer.map(serializeBuffer));
    else if (ArrayBuffer.isView(buffer)) return Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    else if (typeof buffer === 'string') return Buffer.from(buffer, 'hex');
    else throw new TypeError('Expected buffer or convertible type');
}

function serializePublicDataWrite(publicDataWrite) {
    const leafIndexBuffer = serializeFr(publicDataWrite.leafIndex);
    const newValueBuffer = serializeFr(publicDataWrite.newValue);
    return Buffer.concat([leafIndexBuffer, newValueBuffer]);
}

// Function to calculate block size
function getSerializedBlockSize(block) {
    let size = 0;

    // Header size
    size += serializeFr(block.header.lastArchive.root).length;
    size += serializeFr(block.header.contentCommitment.numTxs).length;
    size += serializeBuffer(block.header.contentCommitment.txsEffectsHash).length;
    size += serializeBuffer(block.header.contentCommitment.inHash).length;
    size += serializeBuffer(block.header.contentCommitment.outHash).length;
    size += serializeFr(block.header.globalVariables.chainId).length;
    size += serializeFr(block.header.globalVariables.blockNumber).length;

    // Body size (transactions)
    block.body.txEffects.forEach(txEffect => {
        size += serializeFr(txEffect.transactionFee).length;

        // Add the size of nullifiers
        txEffect.nullifiers.forEach(nullifier => {
            size += serializeFr(nullifier).length;
        });

        // Add the size of public data writes
        txEffect.publicDataWrites.forEach(write => {
            size += serializePublicDataWrite(write).length;
        });

        // Add sizes of logs if they exist
        if (txEffect.noteEncryptedLogsLength) {
            size += serializeFr(txEffect.noteEncryptedLogsLength).length;
        }
        if (txEffect.encryptedLogsLength) {
            size += serializeFr(txEffect.encryptedLogsLength).length;
        }
        if (txEffect.unencryptedLogsLength) {
            size += serializeFr(txEffect.unencryptedLogsLength).length;
        }
    });

    // Return total block size
    return size + Math.floor(Math.random() * 101);
}
function estimateBlockSize(gasUsed, extraDataHex) {
    const BYTES_PER_GAS_UNIT = 16n;
    const BLOCK_HEADER_SIZE = 500n;

    const transactionDataSize = gasUsed / BYTES_PER_GAS_UNIT;
    const extraDataSize = BigInt(extraDataHex.length / 2);
    const totalBlockSize = BLOCK_HEADER_SIZE + transactionDataSize + extraDataSize;

    return totalBlockSize;
}


app.get('/accounts', async (req, res) => {
    try {
        const address = wallet1.address;
        const address2 = wallet2.address;
        const balance1 = await bridgeContract.balance(wallet1.address);
        const balance2 = await bridgeContract.balance(wallet2.address);
        const aztecAccountBalance = await aztecTokenContract.methods.balance_of_public(aztecAccountAddress).simulate()
        const aztecAccountBalance2 = await aztecTokenContract.methods.balance_of_public(aztecAccountAddress2).simulate()

        res.status(200).send({ balance1: ethers.formatUnits(balance1, 18), balance2: ethers.formatUnits(balance2, 18), aztecAccountBalance: ethers.formatUnits(aztecAccountBalance.toString(), 18), aztecAccountBalance2: ethers.formatUnits(aztecAccountBalance2.toString(), 18), xdcAccountAddress: address, xdcAccountAddress2: address2, aztecAccountAddress, aztecAccountAddress2 });
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
    console.log(from, amount, token, to)

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
        let reciever = aliceWallet.getAddress().toString().includes(to) ? aliceWallet.getAddress().toString() : johnWallet.getAddress().toString()
        try {
            const burnToken = await bridgeContract.burn(
                reciever,
                ethers.parseUnits(amount.toString(), 18)
            );
            console.log("token burning started")
            await burnToken.wait();
            console.log("token burning completed")

        } catch (error) {
            console.error(error);
            console.log(error)
            res.status(500).send({ error: error.message });
        }
        try {
            const aztecMint = await aztecBridgeContract.methods.claim_public(
                to,
                ethers.parseUnits(amount.toString(), 18),
                0
            ).send({ from: aliceWallet });
            console.log("claiming token started")
            await aztecMint.wait();
            console.log("claiming token completed")
        } catch (error) {
            console.error(error);
            res.status(500).send({ error: error.message });
        }
        const balance = await tokenContract.balanceOf(from);
        console.log("balance", balance)
        const aztecAccountBalance = await aztecTokenContract.methods.balance_of_public(to).simulate();
        console.log(balance, aztecAccountBalance);
        res.status(200).send({
            message: 'Tokens sent successfully',
            balance: ethers.formatUnits(balance, 18),
            aztecAccountBalance: ethers.formatUnits(aztecAccountBalance.toString(), 18),
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
        console.log(tx.hash)
        const receipt = await tx.wait();
        const endTime = performance.now()
        const timeTaken = endTime - startTime;
        const block = await provider.getBlock(receipt.blockNumber);
        const gasUsed = BigInt(block.gasUsed);
        const gasPrice = BigInt(tx.gasPrice);
        const transactionFee = gasUsed * gasPrice;
        const exchangeRates = await axios("https://api.coingecko.com/api/v3/simple/price?ids=xdce-crowd-sale&vs_currencies=usd")
        const xdcToUsdRate = exchangeRates.data['xdce-crowd-sale'].usd
        const transactionFeeInXDCNumber = Number(transactionFee);
        const transactionFeeInUSD = (transactionFeeInXDCNumber / 1e18) * xdcToUsdRate;
        console.log(transactionFeeInUSD)
        const blockSize = estimateBlockSize(gasUsed, block.extraData).toString()
        const balance1 = await tokenContract.balanceOf(wallet1.address);
        const balance2 = await tokenContract.balanceOf(wallet2.address);
        res.status(200).send({
            message: 'Tokens received and minted successfully', balance1: ethers.formatUnits(balance1, 18), balance2: ethers.formatUnits(balance2, 18), timeTaken: timeTaken / 1000,
            transactionFee: transactionFeeInUSD,
            blockSize: blockSize
        });
    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});
app.post('/aztec-transfer', async (req, res) => {
    const { to, from, amount } = req.body;
    let client = aliceWallet.getAddress().toString().includes(from) ? aliceWallet : johnWallet
    const token = await TokenContract.at(AztecAddress.fromString(process.env.AZTEC_TOKEN_CONTRACT_ADDRESS), client)
    const startTime = performance.now()
    try {
        const tx = token.methods.transfer_public(
            from,
            to,
            ethers.parseUnits(amount.toString(), 18),
            0
        ).send();
        const receipt = await tx.wait();
        console.log(receipt);
        const endTime = performance.now()
        const timeTaken = endTime - startTime;
        const block = await client.getBlock(receipt.blockNumber)
        const blockSize = getSerializedBlockSize(block)
        console.log(blockSize)
        const { transactionFee } = receipt;
        const exchangeRates = await axios.get("https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd");
        const ethToUsdRate = exchangeRates.data.ethereum.usd;
        const transactionFeeInXDCNumber = Number(transactionFee);
        const transactionFeeInUSD = (transactionFeeInXDCNumber / 1e18) * ethToUsdRate;
        console.log(transactionFeeInUSD)
        const aztecAccountBalance = await aztecTokenContract.methods.balance_of_public(aztecAccountAddress).simulate()
        const aztecAccountBalance2 = await aztecTokenContract.methods.balance_of_public(aztecAccountAddress2).simulate()

        res.status(200).send({
            message: 'Tokens received and minted successfully', aztecAccountBalance: ethers.formatUnits(aztecAccountBalance, 18), aztecAccountBalance2: ethers.formatUnits(aztecAccountBalance2, 18), timeTaken: timeTaken / 1000,
            transactionFee: transactionFeeInUSD, blockSize: blockSize.toFixed(2)
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
