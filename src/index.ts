import {
  type AztecAddress,
  type AztecNode,
  type DebugLogger,
  EthAddress,
  ExtendedNote,
  type FieldsOf,
  Fr,
  Note,
  type PXE,
  type SiblingPath,
  type TxHash,
  type TxReceipt,
  type Wallet,
  computeSecretHash,
  deployL1Contract,
  retryUntil,
} from '@aztec/aztec.js';
import { type L1ContractAddresses } from '@aztec/ethereum';
import { sha256ToField } from '@aztec/foundation/crypto';
import {
  InboxAbi,
  OutboxAbi,
  PortalERC20Abi,
  PortalERC20Bytecode,
  TokenPortalAbi,
  TokenPortalBytecode,
} from '@aztec/l1-artifacts';
import { TokenContract } from '@aztec/noir-contracts.js/Token';
import { TokenBridgeContract } from '@aztec/noir-contracts.js/TokenBridge';

import {
  type Account,
  type Chain,
  type GetContractReturnType,
  type HttpTransport,
  type PublicClient,
  type WalletClient,
  getContract,
  toFunctionSelector,
} from 'viem';

/**
 * Deploy L1 token and portal, initialize portal, deploy a non native l2 token contract, its L2 bridge contract and attach is to the portal.
 * @param wallet - the wallet instance
 * @param walletClient - A viem WalletClient.
 * @param publicClient - A viem PublicClient.
 * @param rollupRegistryAddress - address of rollup registry to pass to initialize the token portal
 * @param owner - owner of the L2 contract
 * @param underlyingERC20Address - address of the underlying ERC20 contract to use (if none supplied, it deploys one)
 * @returns l2 contract instance, bridge contract instance, token portal instance, token portal address and the underlying ERC20 instance
 */
export async function deployAndInitializeTokenAndBridgeContracts(
  wallet: Wallet,
  walletClient: WalletClient<HttpTransport, Chain, Account>,
  publicClient: PublicClient<HttpTransport, Chain>,
  rollupRegistryAddress: EthAddress,
  owner: AztecAddress,
  underlyingERC20Address?: EthAddress,
): Promise<{
  /**
   * The L2 token contract instance.
   */
  token: TokenContract;
  /**
   * The L2 bridge contract instance.
   */
  bridge: TokenBridgeContract;
  /**
   * The token portal contract address.
   */
  tokenPortalAddress: EthAddress;
  /**
   * The token portal contract instance
   */
  tokenPortal: any;
  /**
   * The underlying ERC20 contract instance.
   */
  underlyingERC20: any;
}> {
  if (!underlyingERC20Address) {
    underlyingERC20Address = await deployL1Contract(walletClient, publicClient, PortalERC20Abi, PortalERC20Bytecode);
  }
  const underlyingERC20 = getContract({
    address: underlyingERC20Address.toString(),
    abi: PortalERC20Abi,
    client: walletClient,
  });

  // deploy the token portal
  const tokenPortalAddress = await deployL1Contract(walletClient, publicClient, TokenPortalAbi, TokenPortalBytecode);
  const tokenPortal = getContract({
    address: tokenPortalAddress.toString(),
    abi: TokenPortalAbi,
    client: walletClient,
  });

  // deploy l2 token
  const token = await TokenContract.deploy(wallet, owner, 'TokenName', 'TokenSymbol', 18).send().deployed();

  // deploy l2 token bridge and attach to the portal
  const bridge = await TokenBridgeContract.deploy(wallet, token.address, tokenPortalAddress).send().deployed();

  if ((await token.methods.admin().simulate()) !== owner.toBigInt()) {
    throw new Error(`Token admin is not ${owner}`);
  }

  if (!(await bridge.methods.get_token().simulate()).equals(token.address)) {
    throw new Error(`Bridge token is not ${token.address}`);
  }

  // make the bridge a minter on the token:
  await token.methods.set_minter(bridge.address, true).send().wait();
  if ((await token.methods.is_minter(bridge.address).simulate()) === 1n) {
    throw new Error(`Bridge is not a minter`);
  }

  // initialize portal
  await tokenPortal.write.initialize(
    [rollupRegistryAddress.toString(), underlyingERC20Address.toString(), bridge.address.toString()],
    {} as any,
  );

  return { token, bridge, tokenPortalAddress, tokenPortal, underlyingERC20 };
}