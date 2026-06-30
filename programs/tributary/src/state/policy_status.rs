use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum PolicyStatus {
    Active,
    Paused,
    Completed,
}

impl Default for PolicyStatus {
    fn default() -> Self {
        Self::Active
    }
}
