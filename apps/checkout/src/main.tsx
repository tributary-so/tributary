import { Toaster } from "@/components/ui/sonner";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { SolanaProvider } from "./components/solana-provider";
import App from "./app.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <SolanaProvider>
    <BrowserRouter>
      <App />
      <Toaster />
    </BrowserRouter>
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
