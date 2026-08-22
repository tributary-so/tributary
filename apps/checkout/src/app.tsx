"use client";

import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { Navbar, Footer } from "@tributary-so/ui";
import { WalletButton, ClusterUiSelect } from "@tributary-so/ui/solana";
import { Landing } from "./landing";
import { PayPage } from "./pay-page";
import { SuccessPage } from "./pages/success-page";
import { CancelPage } from "./pages/cancel-page";

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="text-muted-foreground text-sm uppercase tracking-[0.12em]">
        Loading...
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="min-h-screen bg-background antialiased font-sans">
      <Navbar
        items={[{ label: "Docs", href: "https://docs.tributary.so", external: true }]}
        actions={
          <>
            <WalletButton />
            <ClusterUiSelect />
          </>
        }
      />
      <main className="mx-auto max-w-5xl px-4">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/subscribe/*" element={<PayPage />} />
            <Route path="/pay/*" element={<PayPage />} />
            <Route path="/policy/*" element={<PayPage />} />
            <Route path="/success" element={<SuccessPage />} />
            <Route path="/cancel" element={<CancelPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
