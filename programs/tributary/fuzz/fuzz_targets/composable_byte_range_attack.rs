// Fuzz target: composable forward byte-range attack surface (bean tributary-ya7m).
//
// The 4 ByteRangeCheck entries pin the forward instruction selector at offset 0
// (programs/tributary/src/state/composable_policy.rs). This target is the
// priority-1 coverage-guided attack on that guard: mutate instruction_data +
// the constraint config and assert:
//   (a) no panic / out-of-bounds read on arbitrary bytes (the OOB defense in
//       ByteRangeCheck::validate), and
//   (b) validate_byte_ranges is self-consistent — it either rejects
//       (ByteRangeCheckFailed) or every active check genuinely holds against
//       the data. A spurious accept is a bug.
//
// Sister coverage: tests/proptest_pure_fns.rs (randomized) + the Mollusk
// conservation/authority oracles (tests/mollusk_oracle.rs, SVM-level). This
// target is the coverage-guided deep-dive the nightly run exercises.

#![no_main]

use libfuzzer_sys::fuzz_target;
use tributary::instructions::composable::execute_composable::validate_byte_ranges;
use tributary::state::{ByteRangeCheck, MAX_BYTE_RANGE_CHECKS};

/// Decode up to MAX_BYTE_RANGE_CHECKS checks from the fuzz prefix, then treat
/// the remainder as `instruction_data`. Layout (best-effort; no hard framing —
/// coverage guidance will explore the whole byte space):
///   u8  num_checks (clamped to MAX_BYTE_RANGE_CHECKS)
///   for each check: u8 offset, u8 length, then `length` expected bytes
///     (zero-padded to the 8-byte expected slot if short)
///   ...remainder → instruction_data
fn decode(data: &[u8]) -> (Vec<ByteRangeCheck>, &[u8]) {
    if data.is_empty() {
        return (vec![], &[]);
    }
    let mut cur = 1usize;
    let num = (data[0] as usize) % (MAX_BYTE_RANGE_CHECKS + 1);
    let mut checks = Vec::with_capacity(num);
    for _ in 0..num {
        if cur + 2 > data.len() {
            break;
        }
        let offset = data[cur];
        let length = data[cur + 1].min(8) as usize;
        cur += 2;
        let mut expected = [0u8; 8];
        let take = length.min(data.len().saturating_sub(cur));
        expected[..take].copy_from_slice(&data[cur..cur + take]);
        cur += take;
        checks.push(ByteRangeCheck {
            offset,
            length: length as u8,
            expected,
        });
    }
    let instruction_data = data.get(cur..).unwrap_or(&[]);
    (checks, instruction_data)
}

fuzz_target!(|data: &[u8]| {
    let (checks, instruction_data) = decode(data);

    // (a) ByteRangeCheck::validate must never panic on arbitrary data.
    for c in &checks {
        let _ = c.validate(instruction_data);
    }

    // (b) validate_byte_ranges: either rejects (num_checks > checks.len() or a
    //     check fails) or the data satisfies every active check. A spurious
    //     accept is a bug.
    let result = validate_byte_ranges(instruction_data, &checks, checks.len() as u8);
    if let Ok(()) = result {
        // accepted ⇒ every check must actually hold against the data
        for c in &checks {
            if !c.validate(instruction_data) {
                panic!("SPURIOUS ACCEPT: validate_byte_ranges returned Ok but a check failed");
            }
        }
    }
    // rejected path is always fine (ByteRangeCheckFailed) — the guard fired.
});
