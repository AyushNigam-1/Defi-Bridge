contract TokenBridge {
    use dep::aztec::prelude::{FunctionSelector, AztecAddress, EthAddress, PublicMutable, SharedImmutable};

    use dep::token_portal_content_hash_lib::{get_mint_public_content_hash, get_mint_private_content_hash, get_withdraw_content_hash};

    use dep::token::Token;

    #[aztec(storage)]
    struct Storage {
        token: PublicMutable<AztecAddress>,
        portal_address: SharedImmutable<EthAddress>,
    }

    #[aztec(public)]
    #[aztec(initializer)]
    fn constructor(token: AztecAddress, portal_address: EthAddress) {
        storage.token.write(token);
        storage.portal_address.initialize(portal_address);
    }

    #[aztec(private)]
    fn get_portal_address() -> EthAddress {
        storage.portal_address.read_private()
    }

    #[aztec(public)]
    fn get_portal_address_public() -> EthAddress {
        storage.portal_address.read_public()
    }

    #[aztec(public)]
    fn claim_public(to: AztecAddress, amount: Field, secret: Field, message_leaf_index: Field) {
        let content_hash = get_mint_public_content_hash(to, amount);

        context.consume_l1_to_l2_message(
            content_hash,
            secret,
            storage.portal_address.read_public(),
            message_leaf_index
        );

        Token::at(storage.token.read()).mint_public(to, amount).call(&mut context);
    }

    #[aztec(public)]
    fn exit_to_l1_public(
        recipient: EthAddress,
        amount: Field,
        caller_on_l1: EthAddress,
        nonce: Field
    ) {
        let content = get_withdraw_content_hash(recipient, amount, caller_on_l1);
        context.message_portal(storage.portal_address.read_public(), content);

        Token::at(storage.token.read()).burn_public(context.msg_sender(), amount, nonce).call(&mut context);
    }

    #[aztec(private)]
    fn claim_private(
        secret_hash_for_redeeming_minted_notes: Field,
        amount: Field,
        secret_for_L1_to_L2_message_consumption: Field
    ) {
        let content_hash = get_mint_private_content_hash(secret_hash_for_redeeming_minted_notes, amount);
        context.consume_l1_to_l2_message(
            content_hash,
            secret_for_L1_to_L2_message_consumption,
            storage.portal_address.read_private()
        );

        TokenBridge::at(context.this_address())._call_mint_on_token(amount, secret_hash_for_redeeming_minted_notes).enqueue(&mut context);
    }

    #[aztec(private)]
    fn exit_to_l1_private(
        token: AztecAddress,
        recipient: EthAddress,
        amount: Field,
        caller_on_l1: EthAddress,
        nonce: Field
    ) {
        let content = get_withdraw_content_hash(recipient, amount, caller_on_l1);
        context.message_portal(storage.portal_address.read_private(), content);

        Token::at(token).burn(context.msg_sender(), amount, nonce).call(&mut context);
    }

    #[aztec(public)]
    #[aztec(view)]
    fn get_token() -> AztecAddress {
        storage.token.read()
    }

    #[aztec(public)]
    #[aztec(internal)]
    fn _call_mint_on_token(amount: Field, secret_hash: Field) {
        Token::at(storage.token.read()).mint_private(amount, secret_hash).call(&mut context);
    }
}
