import React, { useState, useEffect } from "react";
import { codeToHtml } from "shiki";
import { Copy, Check, Terminal } from "lucide-react";

interface CodeExample {
  language: string;
  code: string;
  title: string;
  disabled?: boolean;
  tooltip?: string;
}

interface CodeBlockProps {
  examples: CodeExample[];
  title?: string;
  showLineNumbers?: boolean;
  className?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  examples,
  title,
  className,
}) => {
  const defaultActiveTab = examples.findIndex((example) => !example.disabled);
  const [activeTab, setActiveTab] = useState(
    defaultActiveTab >= 0 ? defaultActiveTab : 0
  );
  const [highlightedCodes, setHighlightedCodes] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [hoveredTab, setHoveredTab] = useState<number | null>(null);

  useEffect(() => {
    const highlightAll = async () => {
      const highlighted = await Promise.all(
        examples.map(async (example) => {
          return await codeToHtml(example.code, {
            lang: example.language,
            theme: "github-light",
          });
        })
      );
      setHighlightedCodes(highlighted);
    };
    highlightAll();
  }, [examples]);

  const handleCopy = () => {
    navigator.clipboard.writeText(examples[activeTab].code);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-neutral-900 w-full max-w-full ${
        className || ""
      }`}
    >
      <div className="bg-neutral-800 px-4 py-3 flex items-center gap-2">
        <Terminal className="w-4 h-4 text-neutral-400" />
        {title && (
          <span className="text-neutral-300 text-sm font-medium">{title}</span>
        )}
        <div className="ml-auto flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-neutral-600" />
          <div className="w-3 h-3 rounded-full bg-neutral-600" />
          <div className="w-3 h-3 rounded-full bg-neutral-600" />
        </div>
      </div>

      {examples.length > 1 && (
        <div className="flex border-b border-neutral-700 bg-neutral-800/50 relative">
          {examples.map((example, index) => (
            <div key={index} className="relative">
              <button
                onClick={() => !example.disabled && setActiveTab(index)}
                onMouseEnter={() => setHoveredTab(index)}
                onMouseLeave={() => setHoveredTab(null)}
                disabled={example.disabled}
                className={`px-5 py-3 text-sm font-medium transition-colors relative ${
                  example.disabled
                    ? "text-neutral-500 cursor-not-allowed opacity-60"
                    : activeTab === index
                    ? "text-purple-400 border-b-2 border-purple-400 bg-neutral-700/50"
                    : "text-neutral-400 hover:text-purple-300 hover:bg-neutral-700/30"
                }`}
              >
                {example.title}
              </button>

              {example.disabled && hoveredTab === index && example.tooltip && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-neutral-900 text-neutral-200 text-xs rounded-md shadow-lg z-10 whitespace-nowrap border border-neutral-700">
                  {example.tooltip}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full border-4 border-transparent border-b-neutral-700"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="p-6 overflow-x-auto text-sm max-w-full relative">
        {highlightedCodes[activeTab] && (
          <div
            dangerouslySetInnerHTML={{ __html: highlightedCodes[activeTab] }}
            className="max-w-full break-words font-mono code-with-line-numbers text-neutral-100"
          />
        )}
      </div>

      <button
        onClick={handleCopy}
        className="absolute top-14 right-4 bg-primary hover:bg-primary/80 text-white text-sm px-4 py-2 rounded-lg transition-all duration-300 shadow-lg hover:shadow-primary/20 flex items-center gap-2"
      >
        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
};

export default CodeBlock;
