import { useState, useEffect } from "react";
import { codeToHtml } from "shiki";
import { Copy, Check } from "lucide-react";

interface TerminalCardProps {
  filename: string;
  code: string;
  language?: string;
  tag?: string;
}

export default function TerminalCard({
  filename,
  code,
  language = "plaintext",
  tag,
}: TerminalCardProps) {
  const [copied, setCopied] = useState(false);
  const [highlighted, setHighlighted] = useState<string>("");

  useEffect(() => {
    const highlight = async () => {
      const html = await codeToHtml(code, {
        lang: language,
        theme: "github-dark",
      });
      setHighlighted(html);
    };
    highlight();
  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="overflow-hidden border border-border/50 bg-neutral-900">
      <div className="flex items-center justify-between px-5 py-1 border-b border-neutral-700">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/40" />
            <div className="w-2.5 h-2.5 rounded-full bg-green-500/40" />
          </div>
          <span className="text-xs text-neutral-500 font-mono ml-2">
            {filename}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {tag && (
            <span className="text-[9px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5">
              {tag}
            </span>
          )}
          <button
            onClick={handleCopy}
            className="text-neutral-500 hover:text-neutral-300 transition-colors"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
      <div className="p-3 overflow-x-auto">
        {highlighted ? (
          <div
            dangerouslySetInnerHTML={{ __html: highlighted }}
            className="font-mono text-sm text-neutral-200 whitespace-pre [&_pre]:!bg-transparent [&_pre]:!p-0 [&_pre]:!m-0 [&_code]:!bg-transparent"
          />
        ) : (
          <pre className="font-mono text-neutral-200 whitespace-pre">
            {code}
          </pre>
        )}
      </div>
    </div>
  );
}
