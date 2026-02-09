"use client";

import { Routes, Route, Navigate } from "react-router-dom";
import { Landing } from "./landing";
import { CheckoutPage } from "./checkout-page";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/subscribe/*" element={<CheckoutPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
