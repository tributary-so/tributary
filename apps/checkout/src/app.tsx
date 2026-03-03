"use client";

import { Routes, Route, Navigate } from "react-router-dom";
import { Landing } from "./landing";
import { PayPage } from "./pay-page";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/subscribe/*" element={<PayPage />} />
      <Route path="/pay/*" element={<PayPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
