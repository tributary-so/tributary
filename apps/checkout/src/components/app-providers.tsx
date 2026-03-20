import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SolanaProvider } from "./solana-provider";
import React from "react";

const queryClient = new QueryClient();

export function AppProviders({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <QueryClientProvider client={queryClient}>
      <SolanaProvider>{children}</SolanaProvider>
    </QueryClientProvider>
  );
}
