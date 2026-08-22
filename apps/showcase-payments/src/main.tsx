import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./globals.css";
import "@tributary-so/ui/styles/fonts";
import { ClusterProvider } from "@tributary-so/ui/solana";
import { SolanaProvider } from "@tributary-so/ui/solana";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HashRouter>
      <ClusterProvider>
        <SolanaProvider>
          <App />
        </SolanaProvider>
      </ClusterProvider>
    </HashRouter>
  </React.StrictMode>
);
