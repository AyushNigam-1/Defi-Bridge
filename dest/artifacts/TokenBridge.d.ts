import { AztecAddress, AztecAddressLike, ContractArtifact, ContractBase, ContractFunctionInteraction, ContractMethod, ContractStorageLayout, ContractNotes, DeployMethod, EthAddressLike, EventSelector, FieldLike, Fr, L1EventPayload, Wallet } from '@aztec/aztec.js';
export declare const TokenBridgeContractArtifact: ContractArtifact;
export type TokenBurned = {
    from: Fr;
    amount: Fr;
    is_private: Fr;
    nonce: Fr;
};
export type TokenMinted = {
    to: Fr;
    amount: Fr;
    is_private: Fr;
};
/**
 * Type-safe interface for contract TokenBridge;
 */
export declare class TokenBridgeContract extends ContractBase {
    private constructor();
    /**
     * Creates a contract instance.
     * @param address - The deployed contract's address.
     * @param wallet - The wallet to use when interacting with the contract.
     * @returns A promise that resolves to a new Contract instance.
     */
    static at(address: AztecAddress, wallet: Wallet): Promise<TokenBridgeContract>;
    /**
     * Creates a tx to deploy a new instance of this contract.
     */
    static deploy(wallet: Wallet, token: AztecAddressLike): DeployMethod<TokenBridgeContract>;
    /**
     * Creates a tx to deploy a new instance of this contract using the specified public keys hash to derive the address.
     */
    static deployWithPublicKeysHash(publicKeysHash: Fr, wallet: Wallet, token: AztecAddressLike): DeployMethod<TokenBridgeContract>;
    /**
     * Creates a tx to deploy a new instance of this contract using the specified constructor method.
     */
    static deployWithOpts<M extends keyof TokenBridgeContract['methods']>(opts: {
        publicKeysHash?: Fr;
        method?: M;
        wallet: Wallet;
    }, ...args: Parameters<TokenBridgeContract['methods'][M]>): DeployMethod<TokenBridgeContract>;
    /**
     * Returns this contract's artifact.
     */
    static get artifact(): ContractArtifact;
    static get storage(): ContractStorageLayout<'admin' | 'minters' | 'balances' | 'total_supply' | 'pending_shields' | 'public_balances' | 'symbol' | 'name' | 'decimals'>;
    static get notes(): ContractNotes<'TransparentNote' | 'TokenNote'>;
    /** Type-safe wrappers for the public methods exposed by the contract. */
    methods: {
        /** claim_public(to: struct, amount: field) */
        claim_public: ((to: AztecAddressLike, amount: FieldLike) => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;
        /** claim_private(secret_hash_for_redeeming_minted_notes: field, amount: field, secret_for_L1_to_L2_message_consumption: field) */
        claim_private: ((secret_hash_for_redeeming_minted_notes: FieldLike, amount: FieldLike, secret_for_L1_to_L2_message_consumption: FieldLike) => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;
        /** constructor(token: struct) */
        constructor: ((token: AztecAddressLike) => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;
        /** exit_to_l1_public(sender: struct, amount: field, nonce: field) */
        exit_to_l1_public: ((sender: AztecAddressLike, amount: FieldLike, nonce: FieldLike) => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;
        /** compute_note_hash_and_optionally_a_nullifier(contract_address: struct, nonce: field, storage_slot: field, note_type_id: field, compute_nullifier: boolean, serialized_note: array) */
        compute_note_hash_and_optionally_a_nullifier: ((contract_address: AztecAddressLike, nonce: FieldLike, storage_slot: FieldLike, note_type_id: FieldLike, compute_nullifier: boolean, serialized_note: FieldLike[]) => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;
        /** exit_to_l1_private(token: struct, recipient: struct, amount: field, caller_on_l1: struct, nonce: field) */
        exit_to_l1_private: ((token: AztecAddressLike, recipient: EthAddressLike, amount: FieldLike, caller_on_l1: EthAddressLike, nonce: FieldLike) => ContractFunctionInteraction) & Pick<ContractMethod, 'selector'>;
    };
    private static decodeEvent;
    static get events(): {
        TokenBurned: {
            decode: (payload: L1EventPayload | undefined) => TokenBurned | undefined;
            eventSelector: EventSelector;
            fieldNames: string[];
        };
        TokenMinted: {
            decode: (payload: L1EventPayload | undefined) => TokenMinted | undefined;
            eventSelector: EventSelector;
            fieldNames: string[];
        };
    };
}
//# sourceMappingURL=TokenBridge.d.ts.map