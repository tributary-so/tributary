import React from "react";
import { interpolate, useCurrentFrame, spring } from "remotion";

interface PillarProps {
  icon: string;
  label: string;
  sublabel: string;
  delay: number;
}

const Pillar: React.FC<PillarProps> = ({ icon, label, sublabel, delay }) => {
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
        backgroundColor: "rgba(34, 197, 94, 0.08)",
        border: "2px solid rgba(34, 197, 94, 0.4)",
        borderRadius: "20px",
        padding: "40px 32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        width: "220px",
        height: "280px",
        boxShadow: "0 4px 24px rgba(0, 0, 0, 0.3)",
      }}
    >
      {/* Icon */}
      <div
        style={{
          fontSize: "48px",
          marginBottom: "20px",
        }}
      >
        {icon}
      </div>

      {/* Label */}
      <div
        style={{
          fontSize: "20px",
          fontWeight: 700,
          color: "#f5f5f5",
          marginBottom: "12px",
        }}
      >
        {label}
      </div>

      {/* Sublabel */}
      <div
        style={{
          fontSize: "15px",
          color: "#9ca3af",
          lineHeight: 1.5,
        }}
      >
        {sublabel}
      </div>
    </div>
  );
};

interface ArchitectureProps {
  pillars: PillarProps[];
}

export const Architecture: React.FC<ArchitectureProps> = ({ pillars }) => {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "32px",
        width: "100%",
        height: "100%",
        padding: "60px",
      }}
    >
      {pillars.map((pillar, index) => (
        <Pillar
          key={index}
          {...pillar}
          delay={index * 15}
        />
      ))}
    </div>
  );
};
