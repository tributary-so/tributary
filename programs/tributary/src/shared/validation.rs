use anchor_lang::prelude::*;

pub fn dispatch_validation_cpi<'info>(
    _validation_config: &crate::state::composable_policy::ValidationConfig,
    _remaining_accounts: &[AccountInfo<'info>],
    _user_payment_owner: &Pubkey,
    _user_payment_mint: &Pubkey,
    _user_payment_bump: u8,
) -> anchor_lang::Result<()> {
    Ok(())
}

pub fn split_remaining_accounts<'info>(
    remaining_accounts: &'info [AccountInfo<'info>],
    num_validation_accounts: u8,
    has_validation: bool,
) -> (&'info [AccountInfo<'info>], &'info [AccountInfo<'info>]) {
    if !has_validation {
        return (&[], remaining_accounts);
    }
    let split = 1 + num_validation_accounts as usize;
    if split >= remaining_accounts.len() {
        (remaining_accounts, &[])
    } else {
        (&remaining_accounts[..split], &remaining_accounts[split..])
    }
}
