import React, { useState, useEffect } from "react";
import { codeToHtml } from "shiki";

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
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  examples,
  title,
  showLineNumbers = true,
}) => {
  // Find the first non-disabled tab as default
  const defaultActiveTab = examples.findIndex((example) => !example.disabled);
  const [activeTab, setActiveTab] = useState(
    defaultActiveTab >= 0 ? defaultActiveTab : 0
  );
  const [highlightedCodes, setHighlightedCodes] = useState<string[]>([]);
  const [copyButtonText, setCopyButtonText] = useState("Copy");
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
  }, [examples, showLineNumbers]);

  const handleCopy = () => {
    navigator.clipboard.writeText(examples[activeTab].code);
    setCopyButtonText("Copied!");
    setTimeout(() => {
      setCopyButtonText("Copy");
    }, 2000);
  };

  return (
    <div className="relative overflow-hidden shadow-2xl rounded-2xl border-2 border-neutral-200 bg-white w-full max-w-full">
      {title && (
        <div className="bg-gradient-to-r from-primary to-secondary px-6 py-4 text-white text-lg font-bold rounded-t-2xl">
          {title}
        </div>
      )}

      {/* Framework Tabs */}
      {examples.length > 1 && (
        <div className="flex border-b border-neutral-200 bg-neutral-50 relative">
          {examples.map((example, index) => (
            <div key={index} className="relative">
              <button
                onClick={() => !example.disabled && setActiveTab(index)}
                onMouseEnter={() => setHoveredTab(index)}
                onMouseLeave={() => setHoveredTab(null)}
                disabled={example.disabled}
                className={`px-6 py-3 text-sm font-medium transition-colors relative ${
                  example.disabled
                    ? "text-neutral-400 cursor-not-allowed opacity-60"
                    : activeTab === index
                    ? "text-primary border-b-2 border-primary bg-white"
                    : "text-neutral-600 hover:text-primary hover:bg-neutral-100"
                }`}
              >
                {example.title}
              </button>

              {/* Tooltip for disabled tabs */}
              {example.disabled && hoveredTab === index && example.tooltip && (
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-neutral-800 text-white text-xs rounded-md shadow-lg z-10 whitespace-nowrap">
                  {example.tooltip}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full border-4 border-transparent border-b-neutral-800"></div>
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
            className="max-w-full break-words font-mono code-with-line-numbers"
          />
        )}
      </div>

      <button
        onClick={handleCopy}
        className="absolute bottom-4 right-4 bg-electric hover:bg-primary text-white text-sm px-4 py-2 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        {copyButtonText}
      </button>
    </div>
  );
};

export default CodeBlock;
