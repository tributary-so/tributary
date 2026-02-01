import { Toaster } from "@/components/ui/sonner";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "./index.css";
import App from "./app.tsx";

createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <App />
    <Toaster />
  </BrowserRouter>
);
// Patch BigInt so we can log it using JSON.stringify without any errors
declare global {
  interface BigInt {
    toJSON(): string;
  }
}

BigInt.prototype.toJSON = function () {
  return this.toString();
};
