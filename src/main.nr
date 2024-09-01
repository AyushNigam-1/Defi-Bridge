contract TokenBridge {
    use dep::aztec::prelude::{FunctionSelector, AztecAddress, EthAddress, PublicMutable, SharedImmutable};
    use dep::token_portal_content_hash_lib::{get_mint_public_content_hash, get_mint_private_content_hash, get_withdraw_content_hash};
    use std::hash::poseidon2::Poseidon2Hasher;
    use std::hash::BuildHasherDefault;
    use std::collections::map::HashMap;
    use dep::token::Token;

    #[aztec(storage)]
     struct Storage {
        token: PublicMutable<AztecAddress>,
  locks: PublicMutable<Vec<(AztecAddress, AztecAddress, Field, bool)>>,

     }
    struct Lock {
        owner: AztecAddress,
        token: AztecAddress,
        amount: Field,
        confirmed: bool,
    }

    #[aztec(public)]
    #[aztec(initializer)]
    fn constructor(token: AztecAddress) {
        storage.token.write(token);
    }

    #[aztec(public)]
    fn claim_public(to: AztecAddress, amount: Field) {
        Token::at(storage.token.read()).mint_public(to, amount).call(&mut context);
    }

    #[aztec(public)]
    fn transfer_public(from: AztecAddress, to: AztecAddress, amount: Field, nonce: Field) {
        Token::at(storage.token.read()).transfer_public(from, to, amount, nonce).call(&mut context);
    }

    #[aztec(public)]
    fn exit_to_l1_public(sender: AztecAddress, amount: Field, nonce: Field) {
        Token::at(storage.token.read()).burn_public(sender, amount, nonce).call(&mut context);
    }

    #[aztec(private)]
    fn claim_private(
        secret_hash_for_redeeming_minted_notes: Field,
        amount: Field,
        secret_for_L1_to_L2_message_consumption: Field
    ) {
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
        TokenBridge::at(context.this_address())._assert_token_is_same(token).enqueue(&mut context);
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
