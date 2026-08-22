import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Terms from "./pages/Terms";
import Futardio from "./pages/Futardio";
import TributaryAngelPitch from "./pages/Angel";

export default function App() {
  return (
    <div className="min-h-screen bg-background antialiased font-sans">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/futardio" element={<Futardio />} />
        <Route path="/angel" element={<TributaryAngelPitch />} />
      </Routes>
    </div>
  );
}
