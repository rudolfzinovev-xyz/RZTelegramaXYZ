"use client";
import { motion } from "framer-motion";
import { useMusicPlayer } from "../desk/MusicPlayerContext";

// Persistent mini-player above the bottom nav. Tapping the body opens the
// full modal; play/pause stays inline. Shows itself only when there is
// at least one track loaded so the bar doesn't waste space when empty.
export function MobileMusicMini() {
  const { tracks, track, playing, progress, duration, togglePlay, setModalOpen } = useMusicPlayer();

  if (!tracks.length || !track) return null;

  const pct = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  return (
    <div
      className="fixed left-0 right-0 z-30"
      style={{
        bottom: "calc(60px + env(safe-area-inset-bottom))",
      }}
    >
      <div
        className="mx-3 mb-1 no-select"
        style={{
          background: "linear-gradient(180deg, rgba(58,32,16,0.97), rgba(40,24,12,0.95))",
          border: "1px solid rgba(218,165,32,0.3)",
          borderRadius: 8,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          boxShadow: "0 -4px 16px rgba(0,0,0,0.6)",
          overflow: "hidden",
        }}
      >
        {/* Progress bar */}
        <div style={{ height: 2, background: "rgba(0,0,0,0.4)" }}>
          <div
            style={{
              height: "100%",
              width: `${pct}%`,
              background: "linear-gradient(90deg, #B8860B, #DAA520)",
              transition: "width 0.2s linear",
            }}
          />
        </div>

        <div className="flex items-center gap-3 px-3 py-2">
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-3 flex-1 min-w-0 tap-target"
            style={{ background: "transparent", border: "none", padding: 0, cursor: "pointer" }}
            aria-label="Открыть плеер"
          >
            <motion.div
              animate={{ rotate: playing ? 360 : 0 }}
              transition={{ duration: 2.6, repeat: playing ? Infinity : 0, ease: "linear" }}
              style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "radial-gradient(circle at 40% 35%, #2a2a2a 0%, #080808 100%)",
                flexShrink: 0,
                position: "relative",
              }}
            >
              <div style={{
                position: "absolute", top: "50%", left: "50%",
                width: 14, height: 14, marginLeft: -7, marginTop: -7,
                borderRadius: "50%",
                background: "radial-gradient(circle at 40% 35%, #f0c040, #c8900a 60%, #8a5a00 100%)",
              }} />
            </motion.div>
            <div className="flex-1 min-w-0 text-left">
              <div
                className="font-typewriter tracking-widest uppercase truncate"
                style={{ color: playing ? "#DAA520" : "#8a7050", fontSize: 9, lineHeight: 1 }}
              >
                {playing ? "♪ ИГРАЕТ" : "ГРАММОФОН"}
              </div>
              <div
                className="font-courier truncate"
                style={{ color: "#f5e8c8", fontSize: 12, marginTop: 2 }}
              >
                {track.title}
              </div>
            </div>
          </button>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={togglePlay}
            aria-label={playing ? "Пауза" : "Играть"}
            className="tap-target no-select"
            style={{
              width: 40, height: 40, borderRadius: "50%",
              background: "radial-gradient(circle at 35% 35%, #DAA520, #8a5010)",
              border: "2px solid #5a3010",
              color: "#1a0a00",
              fontSize: 18,
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {playing ? "⏸" : "▶"}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
