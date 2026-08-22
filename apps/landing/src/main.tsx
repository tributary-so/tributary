import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { Navbar, Footer } from "@tributary-so/ui";
import App from "./App";
import "./globals.css";
import "@tributary-so/ui/styles/fonts";

function Shell() {
  return (
    <HashRouter>
      <Navbar
        items={[
          { label: "How It Works", href: "how-it-works" },
          { label: "Protocol", href: "primitive" },
          { label: "Use Cases", href: "use-cases" },
          { label: "FAQ", href: "faq" },
        ]}
      />
      <App />
      <Footer
        linkGroups={[
          {
            title: "Resources",
            links: [
              { label: "GitHub", href: "https://github.com/tributary-so" },
              { label: "Documentation", href: "https://docs.tributary.so" },
              { label: "SDK Reference", href: "https://sdk.tributary.so" },
              { label: "npm Package", href: "https://npmjs.com/package/@tributary-so/sdk" },
            ],
          },
          {
            title: "Products",
            links: [
              { label: "Main App", href: "https://app.tributary.so" },
              { label: "Hosted Checkout", href: "https://checkout.tributary.so" },
              { label: "Lando", href: "https://lando.tributary.so" },
            ],
          },
        ]}
        tagline="One primitive, three knobs — non-custodial payment policies on Solana. Delegate once; money moves on schedule."
      />
    </HashRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Shell />
  </React.StrictMode>
);
