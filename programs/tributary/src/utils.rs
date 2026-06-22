//! Cross-cutting helpers that don't yet belong to a dedicated `shared/*`
//! module.
//!
//! Historically this file also held:
//! * referral reward distribution — now in [`crate::shared::referral`]
//! * calendar-month math       — now in [`crate::shared::schedule`]
//! * Token-2022 mint validation — now in [`crate::shared::mint`]
//!
//! The three extractions above were performed under audit finding M1
//! (`reports/M1-utils-rs-stalled-extraction-1236-lines.md`). What remains
//! here is intentionally minimal; future helpers should land in their own
//! `shared/*` module rather than growing this file again.
