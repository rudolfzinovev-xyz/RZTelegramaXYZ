"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface DeskClockProps {
  timezone: string;
}

function getTimeInZone(timezone: string): Date {
  const match = timezone.match(/UTC([+-])(\d+)/);
  if (!match) return new Date();
  const sign = match[1] === "+" ? 1 : -1;
  const hours = parseInt(match[2], 10);
  const utc = Date.now() + new Date().getTimezoneOffset() * 60000;
  return new Date(utc + sign * hours * 3600000);
}

export function DeskClock({ timezone }: DeskClockProps) {
  const [time, setTime] = useState<Date | null>(null);

  useEffect(() => {
    setTime(getTimeInZone(timezone));
    const id = setInterval(() => setTime(getTimeInZone(timezone)), 1000);
    return () => clearInterval(id);
  }, [timezone]);

  if (!time) return <div style={{ width: 90, height: 160 }} />;

  const h = time.getHours() % 12;
  const m = time.getMinutes();
  const s = time.getSeconds();

  const secondDeg = s * 6;
  const minuteDeg = m * 6 + s * 0.1;
  const hourDeg = h * 30 + m * 0.5;

  const cx = 45;
  const cy = 45;
  const r = 38;

  function hand(deg: number, length: number, width: number, color: string) {
    const rad = (deg - 90) * (Math.PI / 180);
    return (
      <line
        x1={cx}
        y1={cy}
        x2={cx + length * Math.cos(rad)}
        y2={cy + length * Math.sin(rad)}
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
      />
    );
  }

  return (
    <div className="flex flex-col items-center select-none" style={{ width: 90 }}>
      {/* Clock case */}
      <div
        style={{
          background: "linear-gradient(180deg, #5a3a1a 0%, #3a2010 100%)",
          border: "3px solid #2a1008",
          borderRadius: "8px 8px 0 0",
          padding: "6px 6px 0 6px",
          boxShadow: "2px 0 0 #7a5030, -2px 0 0 #7a5030, 0 -2px 0 #7a5030",
        }}
      >
        {/* Clock face */}
        <svg width="78" height="78" viewBox="0 0 90 90">
          {/* Face */}
          <circle cx={cx} cy={cy} r={r} fill="#f5f0e0" stroke="#8a6030" strokeWidth="3" />
          {/* Inner ring */}
          <circle cx={cx} cy={cy} r={r - 4} fill="none" stroke="#c8a870" strokeWidth="0.5" />

          {/* Hour ticks */}
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i * 30 - 90) * (Math.PI / 180);
            const x1 = cx + (r - 5) * Math.cos(a);
            const y1 = cy + (r - 5) * Math.sin(a);
            const x2 = cx + (r - 9) * Math.cos(a);
            const y2 = cy + (r - 9) * Math.sin(a);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5a3a10" strokeWidth="2" strokeLinecap="round" />;
          })}

          {/* Minute ticks */}
          {Array.from({ length: 60 }).map((_, i) => {
            if (i % 5 === 0) return null;
            const a = (i * 6 - 90) * (Math.PI / 180);
            const x1 = cx + (r - 4) * Math.cos(a);
            const y1 = cy + (r - 4) * Math.sin(a);
            const x2 = cx + (r - 7) * Math.cos(a);
            const y2 = cy + (r - 7) * Math.sin(a);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#a08050" strokeWidth="0.8" />;
          })}

          {/* Hands */}
          {hand(hourDeg, 20, 3, "#2a1008")}
          {hand(minuteDeg, 28, 2, "#3a2010")}
          {hand(secondDeg, 32, 1, "#cc3300")}

          {/* Center cap */}
          <circle cx={cx} cy={cy} r={3} fill="#8a6030" />
          <circle cx={cx} cy={cy} r={1.5} fill="#DAA520" />
        </svg>
      </div>

      {/* Pendulum housing */}
      <div
        style={{
          background: "linear-gradient(180deg, #3a2010, #2a1808)",
          border: "3px solid #2a1008",
          borderTop: "none",
          borderRadius: "0 0 6px 6px",
          width: 90,
          height: 70,
          position: "relative",
          overflow: "hidden",
          boxShadow: "2px 4px 8px rgba(0,0,0,0.5), 2px 0 0 #7a5030, -2px 0 0 #7a5030",
        }}
      >
        {/* Glass panel shine */}
        <div style={{
          position: "absolute", inset: 4,
          background: "rgba(180,160,120,0.04)",
          border: "1px solid rgba(218,165,32,0.1)",
          borderRadius: "2px",
        }} />

        {/* Pendulum rod */}
        <motion.div
          animate={{ rotate: [18, -18, 18] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          style={{ position: "absolute", top: 0, left: "50%", transformOrigin: "top center", marginLeft: -1 }}
        >
          {/* Rod */}
          <div style={{ width: 2, height: 42, background: "linear-gradient(180deg, #DAA520, #8a6030)", margin: "0 auto" }} />
          {/* Bob */}
          <div style={{
            width: 22, height: 22,
            borderRadius: "50%",
            background: "radial-gradient(circle at 35% 35%, #DAA520, #8a5010)",
            border: "1px solid #5a3010",
            marginLeft: -10,
            boxShadow: "0 2px 6px rgba(0,0,0,0.5)",
          }} />
        </motion.div>
      </div>

      {/* Timezone */}
      <div className="font-typewriter text-center mt-1" style={{ fontSize: 8, color: "#8a6a4a", letterSpacing: "0.1em" }}>
        {timezone}
      </div>
    </div>
  );
}
