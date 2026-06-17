DEPLOY_KEY_PATH := ~/.config/solana/ADmSd9uYBRbLGa9rN1NtFv5LXtwLPdtVwGT5xhAYY4xZ.json
PROGRAM_ID_PATH := ~/.config/solana/TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ.json
PROGRAM_ID := TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ
SOLANA_API := $(or $(SOLANA_API),https://api.mainnet-beta.solana.com)
SOLANA_WS := $(subst https://,wss://,$(SOLANA_API))
SOL_ARGS:=--with-compute-unit-price 1000 \
		  --keypair $(DEPLOY_KEY_PATH) \
		  --ws $(SOLANA_WS) \
		  --max-sign-attempts 1000
prep:
	avm use 0.31.0

test:
	anchor test

run_surfpool:
	surfpool start --legacy-anchor-compatibility --watch

test_surfpool:
	anchor run test-surfpool
	anchor run test-topup

all_tests: test test_surfpool

# Devnet ######################################
devnet_expand:
	solana program extend $(PROGRAM_ID) 20480

devnet_build:
	anchor build

devnet_deploy:
	anchor deploy --provider.cluster devnet --program-keypair $(PROGRAM_ID_PATH) -p tributary

devnet_deploy_buffer:
	solana balance
	solana program write-buffer --buffer $(BUFFER) ./target/deploy/tributary.so
	solana program deploy --program-id $(PROGRAM_ID_PATH) --buffer $(BUFFER)
	solana balance

# Mainnet ######################################
mainnet_expand:
	solana program extend -k $(DEPLOY_KEY_PATH) $(PROGRAM_ID) 20480

mainnet_build:
	anchor build --provider.wallet ${DEPLOY_KEY_PATH} --provider.cluster mainnet -p tributary -- --features mainnet

mainnet_deploy_buffer:
	solana -k ${DEPLOY_KEY_PATH} balance
	solana program write-buffer $(SOL_ARGS) --buffer $(BUFFER) ./target/deploy/tributary.so
	solana program deploy --ws $(SOLANA_API) --keypair $(DEPLOY_KEY_PATH) --program-id $(PROGRAM_ID_PATH) --buffer $(BUFFER)
	solana -k ${DEPLOY_KEY_PATH} balance

mainnet_deploy:
	solana -k ${DEPLOY_KEY_PATH} balance
	solana program deploy $(SOL_ARGS) --program-id $(PROGRAM_ID_PATH) ./target/deploy/tributary.so
	solana -k ${DEPLOY_KEY_PATH} balance

publish_idl:
	anchor idl upgrade -f target/idl/tributary.json --provider.cluster $(SOLANA_API) --provider.wallet $(DEPLOY_KEY_PATH) $(PROGRAM_ID)

submit-verifable-build:
	yes | solana-verify verify-from-repo --remote \
	--url  $(SOLANA_API) \
	--program-id $(PROGRAM_ID) \
	https://github.com/tributary-so/tributary \
	--library-name tributary \
	--commit-hash $(shell git show-ref -s origin/main) \
	--keypair $(DEPLOY_KEY_PATH)

verifiable_build:
	solana-verify build
	solana-verify get-executable-hash ./target/deploy/tributary.so
	make mainnet_deploy
	solana-verify get-program-hash -u $(SOLANA_API) $(PROGRAM_ID)

build:
	pnpm run -r --filter "./programs/*" build
	pnpm run -r --filter "./packages/*" build
	pnpm run -r --filter "./apps/*" build
	make -C apps/docs build
