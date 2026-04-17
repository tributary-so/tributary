import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { type TributaryJWTPayload } from "@tributary-so/payments";
import { decodeJwt } from "../lib/jwt";

export default function Success() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const [payload, setPayload] = useState<TributaryJWTPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    decodeJwt(token).then((result) => {
      setPayload(result);
      setLoading(false);
    });
  }, [token]);

  if (loading) {
    return (
      <main className="mx-auto max-w-5xl px-4">
        <section className="py-20 text-center">
          <p className="text-muted-foreground text-sm">Verifying token...</p>
        </section>
      </main>
    );
  }

  if (!token || !payload) {
    return (
      <main className="mx-auto max-w-5xl px-4">
        <section className="py-20 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Invalid Token</h1>
          <p className="text-muted-foreground text-sm mb-6">
            No valid payment token was found in the URL.
          </p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4">
      <section className="py-20">
        <div className="text-center mb-10">
          <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Payment Successful</h1>
          <p className="text-muted-foreground text-sm">
            Your subscription has been created and verified on Solana.
          </p>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <div className="text-center pt-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Create Another Payment
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
