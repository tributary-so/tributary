import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./globals.css";
import { ClusterProvider } from "./components/cluster/cluster-data-access";
import { SolanaProvider } from "./components/solana/solana-provider";

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
