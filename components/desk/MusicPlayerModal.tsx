"use client";
import { motion, AnimatePresence } from "framer-motion";
import { useMusicPlayer } from "./MusicPlayerContext";

function fmt(s: number) {
  if (!isFinite(s)) return "0:00";
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
}

export function MusicPlayerModal() {
  const {
    tracks, track, trackIndex, playing, volume, progress, duration, noFile,
    modalOpen, setModalOpen, togglePlay, next, prev, seek, setVolume, selectTrack,
  } = useMusicPlayer();

  return (
    <AnimatePresence>
      {modalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.75)" }}
          onClick={() => setModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.85, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 30 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 340,
              maxWidth: "92vw",
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
              <button onClick={() => setModalOpen(false)} className="font-typewriter text-[#8a6a4a] hover:text-[#DAA520] text-lg">✕</button>
            </div>

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

            <div className="px-5 pb-2">
              <div className="font-typewriter text-center text-xs tracking-widest uppercase mb-1"
                style={{ color: noFile || !track ? "#CC4422" : "#DAA520" }}>
                {!track ? "— список пуст —" : noFile ? "— файл не найден —" : track.title}
              </div>
              {(noFile || !track) && (
                <div className="font-courier text-center" style={{ fontSize: 9, color: "#6a4a2a" }}>
                  Положите .mp3 в /public/music/ — название появится автоматически
                </div>
              )}
              <div className="font-typewriter text-center" style={{ fontSize: 9, color: "#5a4020" }}>
                {tracks.length ? `${trackIndex + 1} / ${tracks.length}` : "0 / 0"}
              </div>
            </div>

            <div className="px-5 pb-2 flex items-center gap-2">
              <span className="font-typewriter" style={{ fontSize: 9, color: "#5a4020", minWidth: 32 }}>{fmt(progress)}</span>
              <input
                type="range" min={0} max={duration || 100} value={progress}
                onChange={(e) => seek(Number(e.target.value))}
                className="flex-1" style={{ accentColor: "#DAA520", height: 3 }}
              />
              <span className="font-typewriter" style={{ fontSize: 9, color: "#5a4020", minWidth: 32, textAlign: "right" }}>{fmt(duration)}</span>
            </div>

            <div className="px-5 pb-4 flex items-center justify-center gap-6">
              <button onClick={prev}
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
              <button onClick={next}
                style={{ background: "none", border: "none", color: "#8a6030", fontSize: 20, cursor: "pointer" }}>⏭</button>
            </div>

            <div className="px-5 pb-4 flex items-center gap-3">
              <span className="font-typewriter tracking-wider uppercase" style={{ fontSize: 9, color: "#5a4020" }}>Громкость</span>
              <input type="range" min={0} max={1} step={0.01} value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="flex-1" style={{ accentColor: "#DAA520", height: 3 }} />
              <span className="font-typewriter" style={{ fontSize: 9, color: "#5a4020", minWidth: 24 }}>{Math.round(volume * 100)}</span>
            </div>

            <div style={{ borderTop: "1px solid #3a2010", paddingBottom: 6, maxHeight: 180, overflowY: "auto" }}>
              {tracks.map((t, i) => (
                <button key={i}
                  onClick={() => selectTrack(i)}
                  style={{
                    display: "block", width: "100%", textAlign: "left", padding: "6px 20px",
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
  );
}
