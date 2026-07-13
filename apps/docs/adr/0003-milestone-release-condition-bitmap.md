# Milestone release_condition as a bitmap

Milestone policies carry a `release_condition: u8` bitmap that controls
when a milestone may be released: bit 0 (`RELEASE_DUE_DATE`) gates on the
timestamp being reached; bits 1–3 (`RELEASE_GATEWAY`, `RELEASE_OWNER`,
`RELEASE_RECIPIENT`) gate on a specific signer. Bits 1–3 are mutually
exclusive — at most one signer bit may be set.

A bitmap beats the obvious alternatives: a separate bool per condition
inflates the account, and an enum-of-enums forces an arbitrary ordering
on independent conditions. The signer-bit exclusivity is enforced at
create-time so that no policy can end up requiring two signers (which
would make execution brittle if the two parties ever disagreed). The
due-date bit is independent of the signer bits because time + signer is
the natural pairing (e.g. "after Jan 1, gateway may release").

Composable milestone policies inherit the same bitmap and the same
create-time exclusivity check (`H-1` fix), so the semantics are uniform
across both account families.
