import { Toaster } from "@/components/ui/sonner";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { AppProviders } from "./components/app-providers";
import App from "./app.tsx";
import "./index.css";
import "@tributary-so/ui/styles/fonts";

createRoot(document.getElementById("root")!).render(
  <AppProviders>
    <HashRouter>
      <App />
      <Toaster />
    </HashRouter>
  </AppProviders>
);

declare global {
  interface BigInt {
    toJSON(): string;
  }
}

BigInt.prototype.toJSON = function () {
  return this.toString();
};
