TODAY := $(shell date +%Y-%m-%d)
DEPLOY_KEY_PATH := $(or $(TRIBUTRAY_DEPLOY_KEY_PATH),~/.config/solana/id.json)
PROGRAM_ID_PATH := ~/.config/solana/TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ.json
PROGRAM_ID := TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ
SOLANA_API := $(or $(SOLANA_API),https://api.mainnet-beta.solana.com)
SOLANA_WS := $(subst https://,wss://,$(SOLANA_API))
SOL_ARGS:=--keypair $(DEPLOY_KEY_PATH) \
		  --ws $(SOLANA_WS) # \
          #--with-compute-unit-price 1000 \
		  #--max-sign-attempts 1000

prep:
	avm use 0.31.0

run_surfpool:
	surfpool start --legacy-anchor-compatibility --watch

# Full suite (Rust + every jest suite) against a running Surfpool instance.
# Start `make run_surfpool` in a separate terminal first.
test_surfpool:
	anchor run surfpool

all_tests: test_surfpool

# Devnet ######################################
devnet_expand:
	solana program extend $(PROGRAM_ID) 20480

devnet_build:
	anchor build

devnet_deploy:
	solana -k ${DEPLOY_KEY_PATH} balance
	solana program write-buffer $(SOL_ARGS) ./target/deploy/tributary.so
	solana -k ${DEPLOY_KEY_PATH} balance

devnet_deploy_buffer:
	solana balance
	solana program write-buffer --buffer $(BUFFER) ./target/deploy/tributary.so
	solana balance

# Mainnet ######################################
mainnet_expand:
	solana program extend -k $(DEPLOY_KEY_PATH) $(PROGRAM_ID) 20480

mainnet_build:
	anchor build --provider.wallet ${DEPLOY_KEY_PATH} --provider.cluster mainnet -p tributary -- --features mainnet

mainnet_deploy_buffer:
	solana -k ${DEPLOY_KEY_PATH} balance
	solana program write-buffer $(SOL_ARGS) --buffer $(BUFFER) ./target/deploy/tributary.so
	solana -k ${DEPLOY_KEY_PATH} balance

mainnet_deploy: verifiable-build mainnet_upload_program squads-tx
	@echo "===================================="
	@echo "Once updated the program and submitted the squads-tx"
	@echo "run:   make verify-submit"
	@echo "===================================="

mainnet_upload_program:
	solana -k ${DEPLOY_KEY_PATH} balance
	#solana program deploy $(SOL_ARGS) --program-id $(PROGRAM_ID_PATH) ./target/deploy/tributary.so
	solana program write-buffer $(SOL_ARGS) ./target/deploy/tributary.so
	solana -k ${DEPLOY_KEY_PATH} balance
	@echo "===================================="
	@echo "UPLOAD NOW REQUIRES SQUADS MULTISIG!"
	@echo "===================================="

publish_idl:
	anchor idl upgrade -f target/idl/tributary.json --provider.cluster $(SOLANA_API) --provider.wallet $(DEPLOY_KEY_PATH) $(PROGRAM_ID)

# submit-verifable-build:
# 	yes | solana-verify verify-from-repo --remote \
# 	--url  $(SOLANA_API) \
# 	--program-id $(PROGRAM_ID) \
# 	https://github.com/tributary-so/tributary \
# 	--library-name tributary \
# 	--commit-hash $(shell git show-ref -s origin/main) \
# 	--keypair $(DEPLOY_KEY_PATH)

verifiable-build:
	solana-verify build
	solana-verify get-executable-hash ./target/deploy/tributary.so

squads-tx:
	solana-verify export-pda-tx https://github.com/tributary-so/tributary --program-id TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ --uploader 8NU2313J4MtANzEWeNnTUMy1Mf5Agavucf9oX4AagSaB --encoding base58 --compute-unit-price 0

verify-submit:
	solana-verify remote submit-job --program-id TRibg8W8zmPHQqWtyAD1rEBRXEdyU13Mu6qX1Sg42tJ --uploader 8NU2313J4MtANzEWeNnTUMy1Mf5Agavucf9oX4AagSaB

build:
	pnpm run -r --filter "./programs/*" build
	pnpm run -r --filter "./packages/*" build
	pnpm run -r --filter "./apps/*" build
	make -C apps/docs build

bump_apps:
	echo "$(TODAY): $(MESSAGE)" >> apps/scheduler/README.md
	echo "$(TODAY): $(MESSAGE)" >> apps/app/README.md
	echo "$(TODAY): $(MESSAGE)" >> apps/docs/README.md
	echo "$(TODAY): $(MESSAGE)" >> apps/checkout/README.md
	echo "$(TODAY): $(MESSAGE)" >> apps/lando/README.md
	echo "$(TODAY): $(MESSAGE)" >> apps/api/README.md
	echo "$(TODAY): $(MESSAGE)" >> apps/cli/README.md

bump_packages:
	echo "$(TODAY): $(MESSAGE)" >> packages/sdk/README.md
	echo "$(TODAY): $(MESSAGE)" >> packages/sdk-react/README.md
	echo "$(TODAY): $(MESSAGE)" >> packages/sdk-x402/README.md
	echo "$(TODAY): $(MESSAGE)" >> packages/payments/README.md
	echo "$(TODAY): $(MESSAGE)" >> packages/forward-builders/README.md
	echo "$(TODAY): $(MESSAGE)" >> packages/tokens-client/README.md
	echo "$(TODAY): $(MESSAGE)" >> packages/pools-client/README.md

bump_programs:
	echo "$(TODAY): $(MESSAGE)" >> programs/tributary/README.md

lint:
	pnpm run -r --filter "./programs/*" lint
	pnpm run -r --filter "./packages/*" lint
	pnpm run -r --filter "./apps/*" lint
	cargo clippy

surfpool:
	killall -9 surfpool; surfpool start --legacy-anchor-compatibility

test:
	anchor run surfpool
