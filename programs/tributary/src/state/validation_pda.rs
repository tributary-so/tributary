use anchor_lang::prelude::*;

pub const MAX_VALIDATION_DATA_SIZE: usize = 1024;

#[account]
pub struct ValidationPda {
    pub data_len: u16,
    pub data: [u8; MAX_VALIDATION_DATA_SIZE],
}

impl ValidationPda {
    /// Account size: 8 (Anchor disc) + 2 (data_len) + MAX_VALIDATION_DATA_SIZE
    pub const SIZE: usize = 8 + 2 + MAX_VALIDATION_DATA_SIZE;

    /// Calculate exact account size needed for a given data length
    /// Rounds up to 8-byte alignment for rent efficiency
    pub fn space_for(data_len: usize) -> usize {
        let raw = 8 + 2 + data_len;
        (raw + 7) & !7
    }

    /// Get the validation data slice
    pub fn get_data(&self) -> &[u8] {
        &self.data[..self.data_len as usize]
    }
}
