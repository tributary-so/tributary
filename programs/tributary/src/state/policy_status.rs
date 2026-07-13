use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Default)]
pub enum PolicyStatus {
    #[default]
    Active,
    Paused,
    Completed,
}
