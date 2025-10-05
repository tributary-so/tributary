DEPLOY_KEY_PATH := ~/.config/solana/ADmSd9uYBRbLGa9rN1NtFv5LXtwLPdtVwGT5xhAYY4xZ.json
PROGRAM_ID_PATH := ~/.config/solana/TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ.json
PROGRAM_ID := TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ
SOLANA_API := $(or $(SOLANA_API),wss://api.mainnet-beta.solana.com)
SOL_ARGS:=--with-compute-unit-price 1000 \
		  --keypair $(DEPLOY_KEY_PATH) \
		  --ws $(SOLANA_API) \
		  --max-sign-attempts 1000
prep:
	solana-install init 1.18.20
	avm use 0.31.0

# Devnet ######################################
devnet_expand:
	solana program extend $(PROGRAM_ID) 20480

devnet_build: prep
	anchor build -- --features raydium-cp-swap/devnet

devnet_deploy:
	anchor deploy --provider.cluster devnet

devnet_deploy_buffer:
	solana balance
	solana program write-buffer --buffer $(BUFFER) ./target/deploy/recurring_payments.so
	solana program deploy --program-id $(PROGRAM_ID_PATH) --buffer $(BUFFER)
	solana balance

# Mainnet ######################################
mainnet_expand:
	solana program extend -k $(DEPLOY_KEY_PATH) $(PROGRAM_ID) 20480

mainnet_build: prep
	anchor build --provider.wallet ${DEPLOY_KEY_PATH} --provider.cluster mainnet -p recurring_payments -- --features mainnet

mainnet_deploy_buffer:
	solana -k ${DEPLOY_KEY_PATH} balance
	solana program write-buffer $(SOL_ARGS) --buffer $(BUFFER) ./target/deploy/recurring_payments.so
	solana program deploy --ws $(SOLANA_API) --keypair $(DEPLOY_KEY_PATH) --program-id $(PROGRAM_ID_PATH) --buffer $(BUFFER)
	solana -k ${DEPLOY_KEY_PATH} balance

mainnet_deploy:
	solana -k ${DEPLOY_KEY_PATH} balance
	solana program deploy $(SOL_ARGS) --program-id $(PROGRAM_ID_PATH) ./target/deploy/recurring_payments.so
	solana -k ${DEPLOY_KEY_PATH} balance

publish_idl:
	anchor idl upgrade -f target/idl/recurring_payments.json --provider.cluster mainnet --provider.wallet $(DEPLOY_KEY_PATH) $(PROGRAM_ID)
