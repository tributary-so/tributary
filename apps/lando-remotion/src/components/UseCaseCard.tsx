import React from "react";
import { interpolate, useCurrentFrame, spring } from "remotion";

interface UseCaseCardProps {
  icon: string;
  title: string;
  description: string;
  price?: string;
  delay: number;
}

export const UseCaseCard: React.FC<UseCaseCardProps> = ({
  icon,
  title,
  description,
  price,
  delay,
}) => {
  const frame = useCurrentFrame();

  const scale = spring({
    frame: frame - delay,
    fps: 30,
    config: {
      damping: 12,
      stiffness: 80,
      mass: 0.8,
    },
  });

  const opacity = interpolate(
    frame - delay,
    [-30, 0, 15],
    [0, 1, 1],
    { extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        transform: `scale(${Math.max(0, scale)})`,
        opacity,
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        border: "1px solid rgba(34, 197, 94, 0.3)",
        borderRadius: "16px",
        padding: "32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        width: "280px",
        height: "320px",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* Icon */}
      <div
        style={{
          fontSize: "64px",
          marginBottom: "24px",
        }}
      >
        {icon}
      </div>

      {/* Title */}
      <div
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "#f5f5f5",
          marginBottom: "12px",
        }}
      >
        {title}
      </div>

      {/* Description */}
      <div
        style={{
          fontSize: "16px",
          color: "#9ca3af",
          marginBottom: "auto",
        }}
      >
        {description}
      </div>

      {/* Price badge */}
      {price && (
        <div
          style={{
            marginTop: "16px",
            padding: "8px 16px",
            backgroundColor: "rgba(34, 197, 94, 0.2)",
            borderRadius: "20px",
            fontSize: "14px",
            fontWeight: 600,
            color: "#4ade80",
          }}
        >
          {price}
        </div>
      )}
    </div>
  );
};
