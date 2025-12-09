# Verified Deployment

## 1. Verifiable build (Docker-based, deterministic)

```bash
anchor build --verifiable
```

## 2. Deploy (use this exact binary, don't rebuild)

```bash
anchor deploy --provider.cluster mainnet --program-id <PROGRAM_ID>
```

## 3. Commit to git

```bash
git add -A && git commit -m "release: vX.Y.Z"
```

## 4. Verify + upload PDA + submit remote job (auto-yes, correct keypair)

```bash
yes | solana-verify verify-from-repo --remote \
  --url https://api.mainnet-beta.solana.com \
  --program-id <PROGRAM_ID> \
  https://github.com/tributary-so/tributary \
  --library-name tributary \
  --commit-hash <COMMIT> \
  --keypair ~/.config/solana/deployer.json
```

## If rate limited, wait and submit job separately

```bash
solana-verify remote submit-job \
  --program-id <PROGRAM_ID> \
  --uploader <PROGRAM_AUTHORITY> \
  --url https://api.mainnet-beta.solana.com
```
