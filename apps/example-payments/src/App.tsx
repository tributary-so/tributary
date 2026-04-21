import { Routes, Route } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import Home from "./pages/Home";
import Success from "./pages/Success";
import Cancel from "./pages/Cancel";

export default function App() {
  return (
    <div className="min-h-screen bg-background antialiased font-sans">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/success" element={<Success />} />
        <Route path="/cancel" element={<Cancel />} />
      </Routes>
      <Footer />
    </div>
  );
}
