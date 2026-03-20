"use client";

import { Routes, Route, Navigate } from "react-router-dom";
import { Suspense } from "react";
import { AppHeader } from "./components/app-header";
import { AppFooter } from "./components/app-footer";
import { Landing } from "./landing";
import { PayPage } from "./pay-page";

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
      <AppHeader />
      <main className="mx-auto max-w-5xl px-4">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/subscribe/*" element={<PayPage />} />
            <Route path="/pay/*" element={<PayPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      <AppFooter />
    </div>
  );
}
