import { fromWorkspace, LiteSVMProvider } from "anchor-litesvm";
import { Keypair, PublicKey } from "@solana/web3.js";
import { BN, Program, Wallet } from "@coral-xyz/anchor";
import { RecurringPayments } from "../target/types/recurring_payments";
const IDL = require("../target/idl/recurring_payments.json");

test("anchor", async () => {
  const client = fromWorkspace(".");
  const provider = new LiteSVMProvider(client);
  const puppetProgram = new Program<RecurringPayments>(IDL, provider);
  const puppetKeypair = Keypair.generate();
});
