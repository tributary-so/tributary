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
    <div className="relative overflow-hidden shadow-lg rounded-lg border bg-white w-full max-w-full">
      {title && (
        <div className="bg-neutral-700 px-4 py-2 text-neutral-300 text-sm font-semibold rounded-t-2xl">
          {title}
        </div>
      )}
      <div className="p-6 overflow-x-auto text-sm max-w-full">
        <div
          dangerouslySetInnerHTML={{ __html: highlightedCode }}
          className="max-w-full"
        />
      </div>
      <button
        onClick={handleCopy}
        className="absolute bottom-4 right-4 bg-electric hover:bg-primary text-white text-xs px-4 py-2 rounded-full transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105"
      >
        {copyButtonText}
      </button>
    </div>
  );
};

export default CodeBlock;
