import { ReactQueryProvider, ClusterProvider, SolanaProvider } from "@tributary-so/ui/solana";
import { HeroUIProvider, ToastProvider } from "@heroui/react";

import React from "react";

export function AppProviders({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <HeroUIProvider>
      <ReactQueryProvider>
        <ClusterProvider>
          <SolanaProvider>
            <ToastProvider />
            {children}
          </SolanaProvider>
        </ClusterProvider>
      </ReactQueryProvider>
    </HeroUIProvider>
  );
}
