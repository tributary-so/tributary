import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { AppHeader } from "./components/AppHeader";
import { AppFooter } from "./components/AppFooter";
import { Landing } from "./components/Landing";
import { Subscribe } from "./components/Subscribe";

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className=" font-mono text-sm uppercase tracking-[0.12em]">
        Loading...
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-background antialiased font-sans">
      <AppHeader />
      <main className="flex-1 mx-auto max-w-5xl w-full px-4">
        <Suspense fallback={<LoadingFallback />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/subscribe/:data" element={<Subscribe />} />
          </Routes>
        </Suspense>
      </main>
      <AppFooter />
    </div>
  );
}

export default App;
