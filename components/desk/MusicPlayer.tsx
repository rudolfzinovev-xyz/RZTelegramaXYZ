"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Track {
  title: string;
  src: string;
}

const TRACKS: Track[] = [
  { title: "Трек 1", src: "/music/track1.mp3" },
  { title: "Трек 2", src: "/music/track2.mp3" },
  { title: "Трек 3", src: "/music/track3.mp3" },
];

export function MusicPlayer() {
  const [open, setOpen] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.6);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [noFile, setNoFile] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const track = TRACKS[trackIndex];

  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audioRef.current = audio;
    audio.addEventListener("ended", () => setTrackIndex((i) => (i + 1) % TRACKS.length));
    audio.addEventListener("timeupdate", () => setProgress(audio.currentTime));
    audio.addEventListener("loadedmetadata", () => { setDuration(audio.duration); setNoFile(false); });
    audio.addEventListener("error", () => { setNoFile(true); setPlaying(false); });
    return () => { audio.pause(); audio.src = ""; };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = track.src;
    audio.load();
    setProgress(0);
    setNoFile(false);
    if (playing) audio.play().catch(() => { setNoFile(true); setPlaying(false); });
  }, [trackIndex]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause(); setPlaying(false);
    } else {
      audio.play().then(() => { setPlaying(true); setNoFile(false); })
        .catch(() => { setNoFile(true); setPlaying(false); });
    }
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Number(e.target.value);
    setProgress(Number(e.target.value));
  }

  function fmt(s: number) {
    if (!isFinite(s)) return "0:00";
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
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

      {/* ── Desk object ── */}
      <button
        onClick={() => setOpen(true)}
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
            {/* Clip to the vinyl ellipse shape */}
            <clipPath id="vinyl-clip-h">
              <ellipse cx="108" cy="118" rx="90" ry="27" />
            </clipPath>
            <filter id="g-shadow">
              <feDropShadow dx="2" dy="5" stdDeviation="5" floodColor="#000" floodOpacity="0.55" />
            </filter>
          </defs>

          {/* ── Cabinet body ── */}
          <rect x="8" y="108" width="218" height="62" rx="6" fill="url(#g-cabinet)" filter="url(#g-shadow)" />
          {/* Cabinet top surface */}
          <rect x="8" y="108" width="218" height="12" rx="6" fill="#6a4020" />
          {/* Wood grain on sides */}
          {[30,60,95,130,165,200].map(x => (
            <line key={x} x1={x} y1="112" x2={x-4} y2="168" stroke="#2a1008" strokeWidth="0.8" opacity="0.3" />
          ))}
          {/* Front panel recess */}
          <rect x="20" y="126" width="196" height="36" rx="3" fill="#1a0c04" opacity="0.45" />
          {/* Knobs row */}
          <circle cx="196" cy="144" r="8"   fill="#1a1008" stroke="#5a3010" strokeWidth="1.5" />
          <circle cx="196" cy="144" r="4.5" fill="#2a1a08" />
          <line x1="196" y1="139" x2="196" y2="142" stroke="#DAA520" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="176" cy="144" r="6.5" fill="#1a1008" stroke="#5a3010" strokeWidth="1.5" />
          <circle cx="176" cy="144" r="3.5" fill={playing ? "#cc3300" : "#330000"} />
          <circle cx="158" cy="144" r="5"   fill="#1a1008" stroke="#5a3010" strokeWidth="1.2" />
          <circle cx="158" cy="144" r="2.5" fill="#2a2a2a" />
          {/* Legs */}
          <rect x="18"  y="167" width="14" height="14" rx="3" fill="#180a02" />
          <rect x="194" y="167" width="14" height="14" rx="3" fill="#180a02" />

          {/* ── Platter mat — sits ON cabinet top (cy = cabinet top y) ── */}
          <ellipse cx="108" cy="118" rx="96" ry="30" fill="#1a1a1a" stroke="#111" strokeWidth="1.5" />
          <ellipse cx="108" cy="117" rx="92" ry="27" fill="#252525" />
          <ellipse cx="108" cy="117" rx="88" ry="25" fill="none" stroke="#2e2e2e" strokeWidth="2.5" />

          {/* ── Vinyl record — horizontal, on top of platter ── */}
          <ellipse cx="108" cy="116" rx="90" ry="27" fill="#0d0d0d" stroke="#2a2a2a" strokeWidth="1" />

          {/* Groove rings — static */}
          <g clipPath="url(#vinyl-clip-h)">
            {[84,76,68,60,52,44,36,28].map(r => (
              <ellipse key={r} cx="108" cy="118" rx={r} ry={r * 0.3} fill="none" stroke="#1c1c1c" strokeWidth="1" />
            ))}
            {/* Sheen */}
            <ellipse cx="108" cy="109" rx="56" ry="7" fill="none" stroke="#383838" strokeWidth="4" opacity="0.2" />
          </g>

          {/* Moving dot along outer groove — indicates spinning */}
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

          {/* Label — static, looks clean */}
          <ellipse cx="108" cy="118" rx="27" ry="8.1"  fill="url(#g-label-h)" />
          <ellipse cx="108" cy="118" rx="20" ry="6"    fill="#c8900a" opacity="0.4" />
          <ellipse cx="108" cy="115" rx="12" ry="2.5"  fill="#e8b030" opacity="0.25" />
          <text x="108" y="117" textAnchor="middle" fill="#1a0800" fontSize="5.5" fontFamily="serif" fontWeight="bold">RZ</text>
          <text x="108" y="122" textAnchor="middle" fill="#1a0800" fontSize="4"   fontFamily="serif">REC</text>
          <ellipse cx="108" cy="118" rx="3.5" ry="1"   fill="#1a0800" />

          {/* Spindle */}
          <ellipse cx="108" cy="116" rx="4" ry="1.2" fill="#111" stroke="#444" strokeWidth="0.8" />

          {/* ── Tonearm — top view, over the disc ── */}
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

          {/* ── Caption ── */}
          <text x="108" y="178" textAnchor="middle" fill={playing ? "#DAA520" : "#5a3a18"}
            fontSize="9" fontFamily="courier new, monospace" letterSpacing="3">
            {playing ? "♪ ИГРАЕТ" : "ГРАММОФОН"}
          </text>
        </svg>
      </button>

      {/* ── Modal ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.75)" }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 30 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: 340,
                background: "linear-gradient(180deg, #3a2010 0%, #2a1808 100%)",
                borderRadius: "12px",
                border: "3px solid #5a3a18",
                boxShadow: "8px 16px 48px rgba(0,0,0,0.8)",
                overflow: "hidden",
              }}
            >
              <div className="flex items-center justify-between px-5 py-3"
                style={{ background: "linear-gradient(180deg, #5a3a18, #3a2010)", borderBottom: "2px solid #2a1008" }}>
                <span className="font-typewriter text-[#DAA520] tracking-widest uppercase text-xs">ГРАММОФОН RZ-G1</span>
                <button onClick={() => setOpen(false)} className="font-typewriter text-[#8a6a4a] hover:text-[#DAA520] text-lg">✕</button>
              </div>

              {/* Vinyl in modal */}
              <div className="flex justify-center py-6" style={{ background: "#1a0e06" }}>
                <div style={{ position: "relative", width: 160, height: 160 }}>
                  <motion.div
                    animate={{ rotate: playing ? 360 : 0 }}
                    transition={{ duration: 2.6, repeat: playing ? Infinity : 0, ease: "linear" }}
                    style={{
                      width: 160, height: 160, borderRadius: "50%",
                      background: "radial-gradient(circle at 40% 35%, #2a2a2a 0%, #080808 100%)",
                      boxShadow: "0 0 20px rgba(0,0,0,0.9)",
                    }}
                  >
                    {[74,66,58,50,42,34,26].map(r => (
                      <div key={r} style={{
                        position: "absolute", top: "50%", left: "50%",
                        width: r*2, height: r*2,
                        marginLeft: -r, marginTop: -r,
                        borderRadius: "50%",
                        border: "1px solid #1e1e1e",
                      }} />
                    ))}
                    <div style={{
                      position: "absolute", top: "50%", left: "50%",
                      width: 54, height: 54, marginLeft: -27, marginTop: -27,
                      borderRadius: "50%",
                      background: "radial-gradient(circle at 40% 35%, #f0c040, #c8900a 60%, #8a5a00 100%)",
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontFamily: "serif", fontSize: 10, color: "#1a0800", fontWeight: "bold", lineHeight: 1.2 }}>RZ</span>
                      <span style={{ fontFamily: "serif", fontSize: 8, color: "#1a0800", lineHeight: 1.2 }}>REC</span>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#1a0e06", marginTop: 2 }} />
                    </div>
                  </motion.div>
                  {/* Tonearm in modal */}
                  <motion.div
                    animate={{ rotate: playing ? 24 : 8 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    style={{ position: "absolute", top: 2, right: -10, width: 75, height: 75, transformOrigin: "top right" }}
                  >
                    <svg width="75" height="75" viewBox="0 0 75 75">
                      <circle cx="65" cy="8" r="7" fill="#6a6a6a" stroke="#333" strokeWidth="1.5" />
                      <circle cx="65" cy="8" r="4" fill="#DAA520" />
                      <line x1="65" y1="8" x2="14" y2="62" stroke="#c8a030" strokeWidth="4" strokeLinecap="round" />
                      <line x1="65" y1="8" x2="14" y2="62" stroke="#f0e090" strokeWidth="1" strokeLinecap="round" opacity="0.4" />
                      <rect x="8" y="58" width="12" height="8" rx="2" fill="#4a4a4a" />
                      <circle cx="14" cy="68" r="2.5" fill="#111" />
                    </svg>
                  </motion.div>
                </div>
              </div>

              {/* Track info */}
              <div className="px-5 pb-2">
                <div className="font-typewriter text-center text-xs tracking-widest uppercase mb-1"
                  style={{ color: noFile ? "#CC4422" : "#DAA520" }}>
                  {noFile ? "— файл не найден —" : track.title}
                </div>
                {noFile && <div className="font-courier text-center" style={{ fontSize: 9, color: "#6a4a2a" }}>Добавьте .mp3 в /public/music/</div>}
                <div className="font-typewriter text-center" style={{ fontSize: 9, color: "#5a4020" }}>{trackIndex + 1} / {TRACKS.length}</div>
              </div>

              {/* Progress */}
              <div className="px-5 pb-2 flex items-center gap-2">
                <span className="font-typewriter" style={{ fontSize: 9, color: "#5a4020", minWidth: 32 }}>{fmt(progress)}</span>
                <input type="range" min={0} max={duration || 100} value={progress} onChange={handleSeek}
                  className="flex-1" style={{ accentColor: "#DAA520", height: 3 }} />
                <span className="font-typewriter" style={{ fontSize: 9, color: "#5a4020", minWidth: 32, textAlign: "right" }}>{fmt(duration)}</span>
              </div>

              {/* Controls */}
              <div className="px-5 pb-4 flex items-center justify-center gap-6">
                <button onClick={() => setTrackIndex((i) => (i - 1 + TRACKS.length) % TRACKS.length)}
                  style={{ background: "none", border: "none", color: "#8a6030", fontSize: 20, cursor: "pointer" }}>⏮</button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.93 }} onClick={togglePlay}
                  style={{
                    width: 52, height: 52, borderRadius: "50%",
                    background: "radial-gradient(circle at 35% 35%, #DAA520, #8a5010)",
                    border: "3px solid #5a3010", boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
                    color: "#1a0a00", fontSize: 22, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                  {playing ? "⏸" : "▶"}
                </motion.button>
                <button onClick={() => setTrackIndex((i) => (i + 1) % TRACKS.length)}
                  style={{ background: "none", border: "none", color: "#8a6030", fontSize: 20, cursor: "pointer" }}>⏭</button>
              </div>

              {/* Volume */}
              <div className="px-5 pb-4 flex items-center gap-3">
                <span className="font-typewriter tracking-wider uppercase" style={{ fontSize: 9, color: "#5a4020" }}>Громкость</span>
                <input type="range" min={0} max={1} step={0.01} value={volume}
                  onChange={(e) => setVolume(Number(e.target.value))}
                  className="flex-1" style={{ accentColor: "#DAA520", height: 3 }} />
                <span className="font-typewriter" style={{ fontSize: 9, color: "#5a4020", minWidth: 24 }}>{Math.round(volume * 100)}</span>
              </div>

              {/* Track list */}
              <div style={{ borderTop: "1px solid #3a2010", paddingBottom: 6 }}>
                {TRACKS.map((t, i) => (
                  <button key={i}
                    onClick={() => {
                      setTrackIndex(i); setPlaying(false);
                      setTimeout(() => {
                        audioRef.current?.play().then(() => setPlaying(true)).catch(() => setNoFile(true));
                      }, 80);
                    }}
                    style={{
                      display: "block", width: "100%", textAlign: "left", padding: "4px 20px",
                      background: i === trackIndex ? "rgba(218,165,32,0.12)" : "transparent",
                      color: i === trackIndex ? "#DAA520" : "#6a4a2a",
                      border: "none", cursor: "pointer",
                      fontFamily: "courier new, monospace", fontSize: 10,
                    }}>
                    {i === trackIndex && playing ? "♪ " : "  "}{t.title}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
