# Referral system: gateway-scoped, 3-level chain, ref-code in seeds

Referral chains are at most three levels deep and **gateway-scoped**: a
referral code is unique within a gateway's namespace, and the chain lives
entirely inside one gateway. The 6-character ref-code is part of the
`ReferralAccount` PDA seeds (`["referral", gateway, ref_code]`), so
look-up is by code, not by iteration.

We capped the chain at three levels to bound compute budget: every
enabled referral payment adds up to three `transfer_checked` CPIs plus
deserialisation + writes, and the Solana 1.2M CU limit is real (see the
M-04 finding). Three levels covers realistic multi-tier referral
marketing without blowing the budget on a single execution.

The ref-code is embedded in seeds (rather than carried as a field)
because the code is the lookup key — putting it in seeds makes
`find_program_address` the auth check, and uniqueness across the
gateway namespace falls out for free.
