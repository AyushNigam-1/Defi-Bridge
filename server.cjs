require('dotenv').config();
const express = require('express');
const { ethers } = require('ethers');
const app = express();
const cors = require('cors')
app.use(cors())
app.use(express.json());
console.log(currentAztecAccount)
const provider = new ethers.JsonRpcProvider(process.env.HARDHAT_NODE_URL);

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

const bridgeABI = require('./artifacts/contracts/Bridge.sol/Bridge.json');
const bridgeTokenABI = require('./artifacts/contracts/BridgeToken.sol/BridgeToken.json'); 

const bridgeContract = new ethers.Contract(process.env.BRIDGE_CONTRACT_ADDRESS, bridgeABI.abi, wallet);
const bridgeTokenContract = new ethers.Contract(process.env.BRIDGE_TOKEN_CONTRACT_ADDRESS, bridgeTokenABI.abi, wallet);

app.get('/account-address', (req, res) => {
    try {
        const address = wallet.address;
        res.status(200).send({ accountAddress: address });
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
        res.status(200).send({ balance: ethers.formatUnits(balance, 18) });
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
