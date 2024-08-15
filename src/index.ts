import { getSchnorrAccount } from '@aztec/accounts/schnorr';
import { Fr, GrumpkinScalar, createPXEClient } from '@aztec/aztec.js';
import { Contract } from '@aztec/aztec.js';
import { TokenBridgeContract, TokenBridgeContractArtifact } from './artifacts/TokenBridge.js';

async function main() {

  const PXE_URL = process.env.PXE_URL || 'http://localhost:8080';
  const secretKey = Fr.random();
  const signingPrivateKey = GrumpkinScalar.random();
  const pxe = createPXEClient(PXE_URL);

  const wallet = await getSchnorrAccount(pxe, secretKey, signingPrivateKey).waitSetup();

  const deployedContract = await TokenBridgeContract.deploy(
    wallet, // Wallet instance
    wallet.getAddress(), // token (AztecAddressLike)
    '0xYourPortalAddressHere' // portal_address (EthAddressLike)
  )
    .send()
    .deployed();

  console.log(`Token deployed at ${deployedContract.address.toString()}`);
  const contract = await Contract.at(deployedContract.address, TokenBridgeContractArtifact, wallet);

}
main().catch(err => {
  console.error(`Error in deployment: ${err}`);
  process.exit(1);
});