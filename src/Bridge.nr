contract Bridge {
    use dep::aztec::prelude::{FunctionSelector, AztecAddress, EthAddress, PublicMutable, SharedImmutable};
    use dep::token_portal_content_hash_lib::{get_mint_public_content_hash, get_mint_private_content_hash, get_withdraw_content_hash};
    use dep::token::Token;

    #[aztec(storage)]
     struct Storage {
        token: PublicMutable<AztecAddress>,
     }
    #[aztec(event)]
    struct TokenMinted {
    to: AztecAddress,
    amount: Field,
    is_private: bool,
    }

    #[aztec(event)]
    struct TokenBurned {
    from: AztecAddress,
    amount: Field,
    is_private: bool,
    nonce: Field,
}
    #[aztec(public)]
    #[aztec(initializer)]
    fn constructor(token: AztecAddress) {
        storage.token.write(token);
    }
    #[aztec(public)]
fn claim_public(to: AztecAddress, amount: Field) {
        Token::at(storage.token.read()).mint_public(to, amount).call(&mut context);
        context.emit_unencrypted_log(TokenMinted { to, amount, is_private: false });
    }

    #[aztec(public)]
fn exit_to_l1_public(sender: AztecAddress, amount: Field, nonce: Field) {
        Token::at(storage.token.read()).burn_public(sender, amount, nonce).call(&mut context);
        context.emit_unencrypted_log(TokenBurned { from: sender, amount, is_private: false, nonce });
    }

    #[aztec(private)]
fn claim_private(
        secret_hash_for_redeeming_minted_notes: Field,
        amount: Field,
        secret_for_L1_to_L2_message_consumption: Field
    ) {
        Bridge::at(context.this_address())._call_mint_on_token(amount, secret_hash_for_redeeming_minted_notes).enqueue(&mut context);
    }

    #[aztec(private)]
fn exit_to_l1_private(
        token: AztecAddress,
        recipient: EthAddress,
        amount: Field,
        caller_on_l1: EthAddress,
        nonce: Field
    ) {
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

    #[aztec(public)]
    #[aztec(internal)]
    fn _assert_token_is_same(token: AztecAddress) {
        assert(storage.token.read().eq(token), "Token address is not the same as seen in storage");
    }
}
