"use client";
import { motion } from "framer-motion";
import { useMusicPlayer } from "./MusicPlayerContext";

interface MusicPlayerProps {
  compact?: boolean;
}

// Trigger button only — actual modal/audio state live in
// MusicPlayerProvider; the modal renders via MusicPlayerModal once at root.
export function MusicPlayer({ compact = false }: MusicPlayerProps) {
  const { track, playing, setModalOpen } = useMusicPlayer();

  if (compact) {
    return (
      <button
        onClick={() => setModalOpen(true)}
        className="w-full no-select tap-target"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "linear-gradient(135deg, rgba(218,165,32,0.08), rgba(184,134,11,0.04))",
          border: "1px solid rgba(218,165,32,0.25)",
          borderRadius: 8,
          padding: "12px 14px",
          cursor: "pointer",
        }}
      >
        <motion.div
          animate={{ rotate: playing ? 360 : 0 }}
          transition={{ duration: 2.6, repeat: playing ? Infinity : 0, ease: "linear" }}
          style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "radial-gradient(circle at 40% 35%, #2a2a2a 0%, #080808 100%)",
            flexShrink: 0,
            position: "relative",
          }}
        >
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            width: 18, height: 18, marginLeft: -9, marginTop: -9,
            borderRadius: "50%",
            background: "radial-gradient(circle at 40% 35%, #f0c040, #c8900a 60%, #8a5a00 100%)",
          }} />
        </motion.div>
        <div className="flex-1 min-w-0 text-left">
          <div className="font-typewriter tracking-widest uppercase" style={{ color: "#DAA520", fontSize: 10 }}>
            Граммофон
          </div>
          <div className="font-courier truncate" style={{ color: playing ? "#90EE90" : "#8a7050", fontSize: 11 }}>
            {playing && track ? `♪ ${track.title}` : track ? track.title : "Нет файлов"}
          </div>
        </div>
        <span className="font-typewriter" style={{ color: "#DAA520", fontSize: 18 }}>
          {playing ? "♪" : "▶"}
        </span>
      </button>
    );
  }

  return (
    <>
      <style>{`
        @keyframes rz-dash {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -320; }
        }
        .rz-spin-dash {
          animation: rz-dash 2.5s linear infinite;
        }
      `}</style>
      <button
        onClick={() => setModalOpen(true)}
        style={{ display: "block", background: "none", border: "none", padding: 0, cursor: "pointer", width: 260 }}
        title="Граммофон — нажмите для управления"
      >
        <svg viewBox="0 0 260 185" width="260" height="185" style={{ display: "block", overflow: "visible" }}>
          <defs>
            <linearGradient id="g-cabinet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#5a3418" />
              <stop offset="50%"  stopColor="#3e2010" />
              <stop offset="100%" stopColor="#2a1208" />
            </linearGradient>
            <linearGradient id="g-arm" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%"   stopColor="#e8d080" />
              <stop offset="50%"  stopColor="#c8a030" />
              <stop offset="100%" stopColor="#8a5a08" />
            </linearGradient>
            <radialGradient id="g-label-h" cx="45%" cy="40%" r="60%">
              <stop offset="0%"   stopColor="#f0c040" />
              <stop offset="60%"  stopColor="#c8900a" />
              <stop offset="100%" stopColor="#7a4a00" />
            </radialGradient>
            <clipPath id="vinyl-clip-h">
              <ellipse cx="108" cy="118" rx="90" ry="27" />
            </clipPath>
            <filter id="g-shadow">
              <feDropShadow dx="2" dy="5" stdDeviation="5" floodColor="#000" floodOpacity="0.55" />
            </filter>
          </defs>

          <rect x="8" y="108" width="218" height="62" rx="6" fill="url(#g-cabinet)" filter="url(#g-shadow)" />
          <rect x="8" y="108" width="218" height="12" rx="6" fill="#6a4020" />
          {[30,60,95,130,165,200].map(x => (
            <line key={x} x1={x} y1="112" x2={x-4} y2="168" stroke="#2a1008" strokeWidth="0.8" opacity="0.3" />
          ))}
          <rect x="20" y="126" width="196" height="36" rx="3" fill="#1a0c04" opacity="0.45" />
          <circle cx="196" cy="144" r="8"   fill="#1a1008" stroke="#5a3010" strokeWidth="1.5" />
          <circle cx="196" cy="144" r="4.5" fill="#2a1a08" />
          <line x1="196" y1="139" x2="196" y2="142" stroke="#DAA520" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="176" cy="144" r="6.5" fill="#1a1008" stroke="#5a3010" strokeWidth="1.5" />
          <circle cx="176" cy="144" r="3.5" fill={playing ? "#cc3300" : "#330000"} />
          <circle cx="158" cy="144" r="5"   fill="#1a1008" stroke="#5a3010" strokeWidth="1.2" />
          <circle cx="158" cy="144" r="2.5" fill="#2a2a2a" />
          <rect x="18"  y="167" width="14" height="14" rx="3" fill="#180a02" />
          <rect x="194" y="167" width="14" height="14" rx="3" fill="#180a02" />

          <ellipse cx="108" cy="118" rx="96" ry="30" fill="#1a1a1a" stroke="#111" strokeWidth="1.5" />
          <ellipse cx="108" cy="117" rx="92" ry="27" fill="#252525" />
          <ellipse cx="108" cy="117" rx="88" ry="25" fill="none" stroke="#2e2e2e" strokeWidth="2.5" />

          <ellipse cx="108" cy="116" rx="90" ry="27" fill="#0d0d0d" stroke="#2a2a2a" strokeWidth="1" />

          <g clipPath="url(#vinyl-clip-h)">
            {[84,76,68,60,52,44,36,28].map(r => (
              <ellipse key={r} cx="108" cy="118" rx={r} ry={r * 0.3} fill="none" stroke="#1c1c1c" strokeWidth="1" />
            ))}
            <ellipse cx="108" cy="109" rx="56" ry="7" fill="none" stroke="#383838" strokeWidth="4" opacity="0.2" />
          </g>

          {playing && (
            <ellipse
              cx="108" cy="118" rx="76" ry="22.8"
              fill="none"
              stroke="#888"
              strokeWidth="2.5"
              strokeDasharray="12 280"
              strokeLinecap="round"
              className="rz-spin-dash"
              clipPath="url(#vinyl-clip-h)"
            />
          )}

          <ellipse cx="108" cy="118" rx="27" ry="8.1"  fill="url(#g-label-h)" />
          <ellipse cx="108" cy="118" rx="20" ry="6"    fill="#c8900a" opacity="0.4" />
          <ellipse cx="108" cy="115" rx="12" ry="2.5"  fill="#e8b030" opacity="0.25" />
          <text x="108" y="117" textAnchor="middle" fill="#1a0800" fontSize="5.5" fontFamily="serif" fontWeight="bold">RZ</text>
          <text x="108" y="122" textAnchor="middle" fill="#1a0800" fontSize="4"   fontFamily="serif">REC</text>
          <ellipse cx="108" cy="118" rx="3.5" ry="1"   fill="#1a0800" />

          <ellipse cx="108" cy="116" rx="4" ry="1.2" fill="#111" stroke="#444" strokeWidth="0.8" />

          <circle cx="232" cy="88"  r="8"  fill="#555" stroke="#333" strokeWidth="1.5" />
          <circle cx="232" cy="88"  r="4.5" fill="#3a3a3a" />
          <circle cx="214" cy="98"  r="10" fill="#6a6a6a" stroke="#2a2a2a" strokeWidth="2" />
          <circle cx="214" cy="98"  r="6"  fill="#DAA520" />
          <circle cx="214" cy="98"  r="2"  fill="#1a0800" />
          <line x1="232" y1="88" x2="214" y2="98" stroke="#777" strokeWidth="5" strokeLinecap="round" />
          <line x1="214" y1="98" x2="154" y2="122" stroke="url(#g-arm)" strokeWidth="5" strokeLinecap="round" />
          <line x1="214" y1="98" x2="154" y2="122" stroke="#f0e090" strokeWidth="1.2" strokeLinecap="round" opacity="0.35" />
          <line x1="154" y1="122" x2="140" y2="119" stroke="#666" strokeWidth="5" strokeLinecap="round" />
          <rect x="132" y="115" width="14" height="8" rx="2" fill="#444" stroke="#222" strokeWidth="1" />
          <ellipse cx="138" cy="123" rx="2.5" ry="1" fill="#222" />

          <text x="108" y="178" textAnchor="middle" fill={playing ? "#DAA520" : "#5a3a18"}
            fontSize="9" fontFamily="courier new, monospace" letterSpacing="3">
            {playing ? "♪ ИГРАЕТ" : "ГРАММОФОН"}
          </text>
        </svg>
      </button>
    </>
  );
}
