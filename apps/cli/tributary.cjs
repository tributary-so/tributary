#!/usr/bin/env node

const { spawn, spawnSync } = require("child_process");
const path = require("path");

// Get the path to the built CLI
const cliPath = path.join(__dirname, "dist", "src", "index.js");

// Check if bun is available
function hasBun() {
  try {
    spawnSync("bun", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

if (!hasBun()) {
  console.error("Error: Tributary CLI requires Bun to run.");
  console.error("");
  console.error("Install Bun:");
  console.error("  curl -fsSL https://bun.sh/install | bash");
  console.error("");
  console.error("Then run this CLI again.");
  process.exit(1);
}

// Run with bun, passing all arguments
const child = spawn("bun", [cliPath, ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env },
});

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
