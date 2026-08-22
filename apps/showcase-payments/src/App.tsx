import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { Navbar } from "@tributary-so/ui";
import { Footer } from "@tributary-so/ui";
import { ClusterUiSelect } from "@tributary-so/ui/solana";
import Home from "./pages/Home";
import Success from "./pages/Success";
import Cancel from "./pages/Cancel";
import CheckoutDemo from "./pages/CheckoutDemo";

const ReactButtons = lazy(() => import("./pages/ReactButtons"));

export default function App() {
  return (
    <div className="min-h-screen bg-background text-foreground antialiased font-sans">
      <Navbar
        items={[
          { label: "Docs", href: "https://docs.tributary.so", external: true },
          { label: "Checkout", href: "https://checkout.tributary.so", external: true },
          { label: "GitHub", href: "https://github.com/tributary-so/tributary", external: true },
        ]}
        actions={<ClusterUiSelect />}
      />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/buttons"
          element={
            <Suspense
              fallback={
                <div className="text-center py-20 text-muted-foreground">
                  Loading...
                </div>
              }
            >
              <ReactButtons />
            </Suspense>
          }
        />
        <Route path="/checkout" element={<CheckoutDemo />} />
        <Route path="/success" element={<Success />} />
        <Route path="/cancel" element={<Cancel />} />
      </Routes>
      <Footer />
    </div>
  );
}
