import { Toaster } from "@/components/ui/sonner";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { SolanaProvider } from "./components/solana-provider";
import { Theme } from "@radix-ui/themes";
import App from "./app.tsx";
import "@radix-ui/themes/styles.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <SolanaProvider>
    <HashRouter>
      <Theme>
        <App />
      </Theme>
      <Toaster />
    </HashRouter>
  </SolanaProvider>
);
// Patch BigInt so we can log it using JSON.stringify without any errors
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

BigInt.prototype.toJSON = function () {
  return this.toString();
};
