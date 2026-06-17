import { Routes, Route } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import Home from "./pages/Home";
import Terms from "./pages/Terms";
import Futardio from "./pages/Futardio";
import TributaryComposablePitch from "./pages/Composable";
import TributaryAngelPitch from "./pages/Angel";

export default function App() {
  return (
    <div className="min-h-screen bg-background antialiased font-sans">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/futardio" element={<Futardio />} />
        <Route path="/composable" element={<TributaryComposablePitch />} />
        <Route path="/angel" element={<TributaryAngelPitch />} />
      </Routes>
      <Footer />
    </div>
  );
}
