import { Routes, Route } from "react-router-dom";
import { Header } from "./components/Header";
import { Landing } from "./components/Landing";
import { Subscribe } from "./components/Subscribe";

function App() {
  return (
    <div className="min-h-screen bg-lando-bg">
      <Header />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/subscribe/:data" element={<Subscribe />} />
      </Routes>
    </div>
  );
}

export default App;
