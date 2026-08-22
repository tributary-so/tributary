import { ReactQueryProvider, ClusterProvider, SolanaProvider } from "@tributary-so/ui/solana";
import React from "react";

export function AppProviders({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ReactQueryProvider>
      <ClusterProvider>
        <SolanaProvider>{children}</SolanaProvider>
      </ClusterProvider>
    </ReactQueryProvider>
  );
}
