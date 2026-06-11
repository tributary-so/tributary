use crate::constants::ALLOWED_VALIDATION_PROGRAMS;
use crate::constants::USER_PAYMENT_SEED;
use crate::error::TributaryError;
use crate::state::composable_policy::ValidationConfig;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke_signed;

pub fn dispatch_validation_cpi<'info>(
    validation_config: &ValidationConfig,
    remaining_accounts: &[AccountInfo<'info>],
    user_payment_owner: &Pubkey,
    user_payment_mint: &Pubkey,
    user_payment_bump: u8,
) -> Result<()> {
    if validation_config.validation_program == Pubkey::default() {
        return Ok(());
    }

    require!(
        ALLOWED_VALIDATION_PROGRAMS.contains(&validation_config.validation_program),
        TributaryError::InvalidValidationProgram
    );

    let n = validation_config.num_validation_accounts as usize;
    require!(
        remaining_accounts.len() >= n,
        TributaryError::InvalidValidationProgram
    );

    let validation_accounts: Vec<AccountInfo<'info>> = remaining_accounts[..n].to_vec();

    let program_info = validation_accounts
        .iter()
        .find(|a| a.key() == validation_config.validation_program)
        .cloned();

    let _program_info = match program_info {
        Some(info) => info,
        None => {
            return Err(TributaryError::InvalidValidationProgram.into());
        }
    };

    let bump_bytes = [user_payment_bump];
    let seeds: Vec<&[u8]> = vec![
        USER_PAYMENT_SEED,
        user_payment_owner.as_ref(),
        user_payment_mint.as_ref(),
        &bump_bytes,
    ];

    let actual_len = validation_config.validation_data_len as usize;
    let max_len = crate::state::composable_policy::VALIDATION_DATA_SIZE;
    let ix_data = &validation_config.validation_data[..actual_len.min(max_len)];

    invoke_signed(
        &anchor_lang::solana_program::instruction::Instruction {
            program_id: validation_config.validation_program,
            accounts: validation_accounts
                .iter()
                .map(|a| AccountMeta {
                    pubkey: a.key(),
                    is_signer: a.is_signer,
                    is_writable: a.is_writable,
                })
                .collect(),
            data: ix_data.to_vec(),
        },
        &validation_accounts,
        &[&seeds],
    )?;

    Ok(())
}

pub fn split_remaining_accounts<'info>(
    remaining_accounts: &'info [AccountInfo<'info>],
    num_validation_accounts: u8,
) -> (&'info [AccountInfo<'info>], &'info [AccountInfo<'info>]) {
    let split = num_validation_accounts as usize;
    if split >= remaining_accounts.len() {
        (remaining_accounts, &[])
    } else {
        (&remaining_accounts[..split], &remaining_accounts[split..])
    }
}
