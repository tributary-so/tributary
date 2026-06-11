import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DATA = [
  { year: "2018", visa: 8.5, stable: null },
  { year: "2019", visa: 9.0, stable: null },
  { year: "2020", visa: 9.0, stable: 1.0 },
  { year: "2021", visa: 11.0, stable: 7.2 },
  { year: "2022", visa: 12.0, stable: 8.0 },
  { year: "2023", visa: 12.8, stable: 7.8 },
  { year: "2024", visa: 13.8, stable: 19.5 },
  { year: "2025", visa: 15.0, stable: 33.0 },
];

const MAX_VAL = 35;
const Y_TICKS = [0, 5, 10, 15, 20, 25, 30, 35];
const VISA_CLR = "#2d3142";
const STBL_CLR = "hsl(var(--primary))";

// Layout constants (SVG coordinate space)
const SVG_W = 780;
const SVG_H = 420;
const PAD_L = 64;
const PAD_R = 24;
const PAD_T = 32;
const PAD_B = 48;
const CHART_W = SVG_W - PAD_L - PAD_R;
const CHART_H = SVG_H - PAD_T - PAD_B;

const toY = (val: number) => PAD_T + CHART_H - (val / MAX_VAL) * CHART_H;

const GROUP_W = CHART_W / DATA.length;
const BAR_GAP = 4;
const BAR_W = (GROUP_W - BAR_GAP * 3) / 2;

export default function SlideProblem() {
  const [revealed, setRevealed] = useState(0); // 0‥8 columns revealed
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-reveal one year per ~120 ms → full reveal in ~960 ms
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setRevealed((prev) => {
        if (prev >= DATA.length) {
          clearInterval(timerRef.current!);
          return prev;
        }
        return prev + 1;
      });
    }, 950 / DATA.length);
    return () => clearInterval(timerRef.current!);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full w-full px-3 sm:px-8">
      {/*
      <motion.h2
        className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 sm:mb-6 text-center leading-tight"
        style={{ fontFamily: "var(--font-secondary)" }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        Stablecoins are booming.
        <br />
        <span className="gradient-text">Subscriptions are next.</span>
      </motion.h2>
 */}
      <div
        style={{
          maxWidth: 600,
          margin: "0 auto",
        }}
      >
        {/* Legend */}
        <div className="flex gap-5 mb-3 mt-1.5">
          {[
            { label: "Visa", color: VISA_CLR },
            { label: "Stablecoins", color: STBL_CLR },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ background: color }}
              />
              <span className="text-[13px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* SVG Chart */}
        <svg
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          width="100%"
          style={{ overflow: "visible", display: "block" }}
        >
          {/* Grid lines + Y labels */}
          {Y_TICKS.map((t) => {
            const y = toY(t);
            return (
              <g key={t}>
                <line
                  x1={PAD_L}
                  y1={y}
                  x2={PAD_L + CHART_W}
                  y2={y}
                  stroke="#e0e0dc"
                  strokeWidth={1}
                />
                <text
                  x={PAD_L - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize={12}
                  fill="#999"
                >
                  {t === 0 ? "$0" : `$${t}T`}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {DATA.map((d, i) => {
            const groupX = PAD_L + i * GROUP_W + BAR_GAP;
            const visaX = groupX;
            const stblX = groupX + BAR_W + BAR_GAP;
            const show = i < revealed;

            const visaH = (d.visa / MAX_VAL) * CHART_H;
            const stblH = d.stable != null ? (d.stable / MAX_VAL) * CHART_H : 0;

            return (
              <g key={d.year}>
                {/* Visa bar */}
                <AnimatePresence>
                  {show && (
                    <motion.rect
                      key={`visa-${d.year}`}
                      x={visaX}
                      width={BAR_W}
                      y={toY(d.visa)}
                      height={visaH}
                      rx={3}
                      fill={VISA_CLR}
                      initial={{ scaleY: 0, originY: 1 }}
                      animate={{ scaleY: 1 }}
                      transition={{
                        duration: 0.45,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      style={{
                        transformOrigin: `${visaX + BAR_W / 2}px ${
                          PAD_T + CHART_H
                        }px`,
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* Stablecoin bar */}
                <AnimatePresence>
                  {show && d.stable != null && (
                    <motion.rect
                      key={`stbl-${d.year}`}
                      x={stblX}
                      width={BAR_W}
                      y={toY(d.stable)}
                      height={stblH}
                      rx={3}
                      fill={STBL_CLR}
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{
                        duration: 0.45,
                        ease: [0.22, 1, 0.36, 1],
                        delay: 0.06,
                      }}
                      style={{
                        transformOrigin: `${stblX + BAR_W / 2}px ${
                          PAD_T + CHART_H
                        }px`,
                      }}
                    />
                  )}
                </AnimatePresence>

                {/* X label */}
                <text
                  x={groupX + GROUP_W / 2 - BAR_GAP}
                  y={PAD_T + CHART_H + 20}
                  textAnchor="middle"
                  fontSize={13}
                  fill="#888"
                >
                  {d.year}
                </text>
              </g>
            );
          })}

          {/* Baseline */}
          <line
            x1={PAD_L}
            y1={PAD_T + CHART_H}
            x2={PAD_L + CHART_W}
            y2={PAD_T + CHART_H}
            stroke="#ccc"
            strokeWidth={1}
          />
        </svg>

        {/* Source */}
        <p className="text-[11px] text-muted-foreground mt-0">
          Source: Bitwise Asset Management with data from Artemis and Visa. Data
          from January 1, 2018 to December 31, 2025 (most recently reported data
          for Visa).
        </p>
      </div>
      <motion.p
        className="text-sm text-muted-foreground mt-6 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.6 }}
      >
        Solana captured DeFi. To capture e-commerce, it needs subscriptions.
      </motion.p>
    </div>
  );
}
