import React from "react";
import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

interface CodeBlockProps {
  code: string;
  language?: string;
  fontSize?: number;
  typing?: boolean;
  frameStart?: number;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = "typescript",
  fontSize = 16,
  typing = true,
  frameStart = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Calculate visible characters for typing effect
  const visibleChars = typing
    ? Math.min(Math.floor(((frame - frameStart) * fps) / 5), code.length)
    : code.length;

  const opacity = interpolate(
    frame,
    [frameStart - 15, frameStart, frameStart + 15],
    [0, 1, 1],
  );

  return (
    <div
      style={{
        position: "relative",
        backgroundColor: "#0f1410",
        borderRadius: "12px",
        padding: "24px",
        fontFamily: "'Fira Code', 'JetBrains Mono', monospace",
        fontSize: `${fontSize}px`,
        color: "#e5e7eb",
        overflow: "hidden",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.5)",
        opacity,
        border: "1px solid #1a2f1a",
      }}
    >
      {/* Language indicator */}
      <div
        style={{
          position: "absolute",
          top: "12px",
          right: "12px",
          fontSize: "12px",
          color: "#6ee7b7",
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        {language}
      </div>

      {/* Window controls */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: "#ef4444",
          }}
        />
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: "#f59e0b",
          }}
        />
        <div
          style={{
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: "#22c55e",
          }}
        />
      </div>

      {/* Code content */}
      <pre
        style={{
          margin: 0,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {code.substring(0, visibleChars)}
        {typing && visibleChars < code.length && (
          <span
            style={{
              display: "inline-block",
              width: "2px",
              height: fontSize,
              backgroundColor: "#22c55e",
              marginLeft: "2px",
              animation: "blink 1s step-end infinite",
            }}
          />
        )}
      </pre>

      <style>{`
        @keyframes blink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};
