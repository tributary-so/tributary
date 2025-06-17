# How

- Users have an associated token address for USDC
- the ata can have a delegate with an allowed amount the delegate can withdraw over time
- The smart contract should be made the delegate for an ata in order to _install_ the service into a USDC balance
- Now, i want the smart contract to be able to cover different ways of implementing recurring payments by means of something like a "policy" (feel free to find a better name):
  - Subscription payments - Fixed amounts charged at regular intervals for ongoing services (Netflix, gym memberships, software licenses). You typically agree to automatic renewals.
  - Installment payments - Breaking a large purchase into smaller, scheduled payments over time (car loans, furniture financing, payment plans). The total amount is predetermined.
  - Usage-based recurring payments - Variable amounts based on consumption, charged regularly (utility bills, phone bills with usage charges, cloud computing services). The amount fluctuates but the billing cycle is fixed.
  - Membership dues - Regular payments to maintain membership status (professional associations, clubs, unions). Usually annual or monthly.
  - Automatic bill pay - You authorize companies to automatically withdraw payment for bills that might vary in amount (credit cards, mortgage payments, insurance premiums).
  - Standing orders/automatic transfers - You set up regular transfers between accounts or to other parties (rent payments, savings transfers, charitable donations).
  - Retainer payments - Regular payments to secure ongoing availability of services (legal retainers, consulting agreements, maintenance contracts).
  - donations - like with patreon or github sponsors
- A user will be able to create any kind of _recurring payment_ policy configured for different recipients and policy specific parameters. Need to find a way to utilize enums for this and create PDAs for each installed policy per user
- we allow an ATA with any mint
- we use Anchor 0.31.0!
