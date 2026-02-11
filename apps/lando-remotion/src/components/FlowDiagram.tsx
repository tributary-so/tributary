import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig, spring } from "remotion";

interface FlowStep {
  icon: string;
  label: string;
  sublabel?: string;
}

interface FlowDiagramProps {
  steps: FlowStep[];
  horizontal?: boolean;
  startFrame?: number;
  duration?: number;
}

export const FlowDiagram: React.FC<FlowDiagramProps> = ({
  steps,
  horizontal = true,
  startFrame = 0,
  duration = 60,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  return (
    <div
      style={{
        display: "flex",
        flexDirection: horizontal ? "row" : "column",
        alignItems: "center",
        justifyContent: "center",
        gap: horizontal ? "40px" : "60px",
        width: "100%",
        height: "100%",
        padding: "60px",
      }}
    >
      {steps.map((step, index) => {
        const stepDelay = index * (duration / steps.length);
        const stepFrame = frame - startFrame - stepDelay;

        const scale = spring({
          frame: stepFrame,
          fps: 30,
          config: {
            damping: 12,
            stiffness: 80,
            mass: 0.8,
          },
        });

        const opacity = interpolate(
          stepFrame,
          [-20, 0, 20],
          [0, 1, 1],
          { extrapolateRight: "clamp" }
        );

        const isLast = index === steps.length - 1;

        return (
          <React.Fragment key={index}>
            {/* Step */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                transform: `scale(${Math.max(0, scale)})`,
                opacity,
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: "80px",
                  height: "80px",
                  borderRadius: "20px",
                  backgroundColor: "rgba(34, 197, 94, 0.2)",
                  border: "2px solid #22c55e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "36px",
                  marginBottom: "16px",
                }}
              >
                {step.icon}
              </div>

              {/* Label */}
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: 600,
                  color: "#f5f5f5",
                  textAlign: "center",
                  marginBottom: "8px",
                }}
              >
                {step.label}
              </div>

              {/* Sublabel */}
              {step.sublabel && (
                <div
                  style={{
                    fontSize: "14px",
                    color: "#9ca3af",
                    textAlign: "center",
                    maxWidth: "150px",
                  }}
                >
                  {step.sublabel}
                </div>
              )}
            </div>

            {/* Arrow (not for last step) */}
            {!isLast && (
              <div
                style={{
                  fontSize: "32px",
                  color: "#22c55e",
                  transform: horizontal ? "rotate(0deg)" : "rotate(90deg)",
                  opacity: interpolate(
                    frame - startFrame - (index + 0.5) * (duration / steps.length),
                    [-15, 0],
                    [0, 1],
                    { extrapolateRight: "clamp" }
                  ),
                }}
              >
                →
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
