import { Link } from "react-router-dom";
import { XCircle, ArrowLeft } from "lucide-react";

export function CancelPage() {
  return (
    <section className="py-20 text-center">
      <XCircle className="h-14 w-14 text-destructive mx-auto mb-4" />
      <h1 className="text-2xl font-bold mb-2">Payment Cancelled</h1>
      <p className="text-muted-foreground text-sm mb-2 max-w-md mx-auto">
        The payment was not completed. No charges have been made to your
        account.
      </p>
      <p className="text-muted-foreground text-xs mb-8">
        You can safely close this page or try again.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Try Again
        </Link>
        <a
          href="https://docs.tributary.so"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center px-5 py-2.5 text-sm border border-border hover:bg-accent transition-colors"
        >
          Read the Docs
        </a>
      </div>
    </section>
  );
}
