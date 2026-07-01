import Lake
open Lake DSL

package tributaryProofs

require qedgenSupport from
  "/home/xeroc/.qedgen/workspace/lean_solana"

@[default_target]
lean_lib Tributary where
  roots := #[`Spec]
