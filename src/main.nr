mod types;

contract AztecBridge {
    use dep::aztec::{
        context::{PrivateContext, PublicContext, Context},
        note::{note_getter_options::NoteGetterOptions, note_header::NoteHeader, utils as note_utils},
        hash::compute_secret_hash,
        state_vars::{map::Map, public_state::PublicState, set::Set},
        types::type_serialization::{field_serialization::FieldSerializationMethods, FIELD_SERIALIZED_LEN, bool_serialization::BoolSerializationMethods, BOOL_SERIALIZED_LEN, aztec_address_serialization::AztecAddressSerializationMethods, AZTEC_ADDRESS_SERIALIZED_LEN},
        types::address::AztecAddress,
        selector::compute_selector,
    };

    use crate::types::{transparent_note::{TransparentNote, TransparentNoteMethods, TRANSPARENT_NOTE_LEN}, token_note::{TokenNote, TokenNoteMethods, TOKEN_NOTE_LEN}, balances_map::BalancesMap, safe_u120_serialization::{SafeU120SerializationMethods, SAFE_U120_SERIALIZED_LEN}};
    use dep::authwit::{auth::{assert_current_call_valid_authwit, assert_current_call_valid_authwit_public}};
    use dep::safe_math::SafeU120;

    struct Storage {
        admin: PublicState<AztecAddress, AZTEC_ADDRESS_SERIALIZED_LEN>,
        minters: Map<PublicState<bool, BOOL_SERIALIZED_LEN>>,
        balances: BalancesMap,
        total_supply: PublicState<SafeU120, SAFE_U120_SERIALIZED_LEN>,
        pending_shields: Set<TransparentNote, TRANSPARENT_NOTE_LEN>,
        public_balances: Map<PublicState<SafeU120, SAFE_U120_SERIALIZED_LEN>>,
        processed_hashes: Set<TransparentNote, TRANSPARENT_NOTE_LEN>, // To track processed transactions
    }

    impl Storage {
        fn init(context: Context) -> pub Self {
            Storage {
                admin: PublicState::new(context, 1, AztecAddressSerializationMethods),
                minters: Map::new(context, 2, |context, slot| PublicState::new(context, slot, BoolSerializationMethods)),
                balances: BalancesMap::new(context, 3),
                total_supply: PublicState::new(context, 4, SafeU120SerializationMethods),
                pending_shields: Set::new(context, 5, TransparentNoteMethods),
                public_balances: Map::new(context, 6, |context, slot| PublicState::new(context, slot, SafeU120SerializationMethods)),
                processed_hashes: Set::new(context, 7, TransparentNoteMethods), // To track processed transactions
            }
        }
    }

    #[aztec(private)]
    fn constructor(admin: AztecAddress) {
        let selector = compute_selector("_initialize((Field))");
        context.call_public_function(context.this_address(), selector, [admin.address]);
    }

    #[aztec(public)]
    fn set_admin(new_admin: AztecAddress) {
        assert(storage.admin.read().eq(AztecAddress::new(context.msg_sender())), "caller is not admin");
        storage.admin.write(new_admin);
    }

    #[aztec(public)]
    fn set_minter(minter: AztecAddress, approve: bool) {
        assert(storage.admin.read().eq(AztecAddress::new(context.msg_sender())), "caller is not admin");
        storage.minters.at(minter.address).write(approve);
    }

    #[aztec(public)]
    fn mint_public(to: AztecAddress, amount: Field) {
        assert(storage.minters.at(context.msg_sender()).read(), "caller is not minter");
        let amount = SafeU120::new(amount);
        let new_balance = storage.public_balances.at(to.address).read().add(amount);
        let supply = storage.total_supply.read().add(amount);
        storage.public_balances.at(to.address).write(new_balance);
        storage.total_supply.write(supply);
        emit Mint(to, amount);
    }

    #[aztec(public)]
    fn mint_private(amount: Field, secret_hash: Field) {
        assert(storage.minters.at(context.msg_sender()).read(), "caller is not minter");
        let pending_shields = storage.pending_shields;
        let mut note = TransparentNote::new(amount, secret_hash);
        let supply = storage.total_supply.read().add(SafeU120::new(amount));
        storage.total_supply.write(supply);
        pending_shields.insert_from_public(&mut note);
        emit Mint(context.msg_sender(), amount);
    }

    #[aztec(public)]
    fn shield(from: AztecAddress, amount: Field, secret_hash: Field, nonce: Field) {
        if (from.address != context.msg_sender()) {
            assert_current_call_valid_authwit_public(&mut context, from);
        } else {
            assert(nonce == 0, "invalid nonce");
        }
        let amount = SafeU120::new(amount);
        let from_balance = storage.public_balances.at(from.address).read().sub(amount);
        let pending_shields = storage.pending_shields;
        let mut note = TransparentNote::new(amount.value as Field, secret_hash);
        storage.public_balances.at(from.address).write(from_balance);
        pending_shields.insert_from_public(&mut note);
        emit Lock(from, amount, compute_secret_hash(secret_hash));
    }

    #[aztec(public)]
    fn transfer_public(from: AztecAddress, to: AztecAddress, amount: Field) {
        assert(storage.public_balances.at(from.address).read().gte(amount), "insufficient balance");
        let amount = SafeU120::new(amount);
        let from_balance = storage.public_balances.at(from.address).read().sub(amount);
        let to_balance = storage.public_balances.at(to.address).read().add(amount);
        storage.public_balances.at(from.address).write(from_balance);
        storage.public_balances.at(to.address).write(to_balance);
        emit Transfer(from, to, amount);
    }

    #[aztec(private)]
    fn transfer_private(from: TokenNote, to: AztecAddress, amount: Field) {
        let from_balance = storage.balances.at(from.owner).read().sub(SafeU120::new(from.amount));
        let to_balance = storage.balances.at(to.address).read().add(SafeU120::new(amount));
        storage.balances.at(from.owner).write(from_balance);
        storage.balances.at(to.address).write(to_balance);
        emit Transfer(from.owner, to, amount);
    }

    #[aztec(private)]
    fn unshield(to: AztecAddress, amount: Field, secret_hash: Field) {
        assert(storage.minters.at(context.msg_sender()).read(), "caller is not minter");
        let pending_shields = storage.pending_shields;
        let mut note = TransparentNote::new(amount, secret_hash);
        pending_shields.remove_from_private(&mut note);
        let to_balance = storage.balances.at(to.address).read().add(SafeU120::new(amount));
        storage.balances.at(to.address).write(to_balance);
        emit Unlock(to, amount, compute_secret_hash(secret_hash));
    }

    #[aztec(public)]
    fn process_cross_chain_transfer(target_chain: Field, target_address: Field, amount: Field, secret_hash: Field, tx_hash: Field) {
        assert(storage.minters.at(context.msg_sender()).read(), "caller is not minter");
        let pending_shields = storage.pending_shields;
        let mut note = TransparentNote::new(amount, secret_hash);
        pending_shields.remove_from_private(&mut note);
        storage.processed_hashes.insert_from_public(&mut note);

        // Logic to handle the transfer to the target chain
        // Emit event for cross-chain transfer
        emit Lock(context.msg_sender(), amount, compute_secret_hash(secret_hash));
    }
}
