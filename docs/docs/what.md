# What

We want a Solana smart contract that facilitates the recurring payments

With this functionality, we want a layer in between the actual protocol and an
actual service provider for offering a gateway into the feature, a web frontend,
an API etc, specific to their customers.

In a sense, the entire setup would look like this:

1. End user wants to make recurring payments
2. ... who uses a service provider for its ux, api, etc ..
3. ... which uses the Recurring Payments Contract protocol
4. ... which uses the Solana blockchain

The Protocol itself takes a fee at some point, the provider can take a fee on
another point.
