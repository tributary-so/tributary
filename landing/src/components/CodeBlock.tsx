import React, { useState, useEffect } from "react";
import { codeToHtml } from "shiki";

interface CodeBlockProps {
  code: string;
  language: string;
  title?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, title }) => {
  const [highlightedCode, setHighlightedCode] = useState("");
  const [copyButtonText, setCopyButtonText] = useState("Copy");

  useEffect(() => {
    const highlight = async () => {
      const html = await codeToHtml(code, {
        lang: language,
        theme: "github-light", // Using a light theme for the bright design
      });
      setHighlightedCode(html);
    };

    highlight();
  }, [code, language]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopyButtonText("Copied!");
    setTimeout(() => {
      setCopyButtonText("Copy");
    }, 2000);
  };

  return (
    <div className="relative overflow-hidden shadow-lg bg-slate-900 rounded-lg border bg-white w-full max-w-full">
      {title && (
        <div className="bg-neutral-700 px-4 py-2 text-neutral-300 text-sm font-semibold">
          {title}
        </div>
      )}
      <div className="p-2 overflow-x-auto text-sm max-w-full">
        <div
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
          className="max-w-full"
        />
      </div>
      <button
        onClick={handleCopy}
        className="absolute bottom-2 right-2 bg-neutral-700 hover:bg-neutral-600 text-white text-xs px-3 py-1 rounded-md transition-colors"
      >
        {copyButtonText}
      </button>
    </div>
  );
};

export default CodeBlock;
