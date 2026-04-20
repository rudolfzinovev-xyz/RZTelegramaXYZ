"use client";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  user: { name: string; phone: string; timezone: string };
  online: boolean;
  unreadCount: number;
  sendStatus: "idle" | "sending" | "delivered";
}

export function MobileTopBar({ user, online, unreadCount, sendStatus }: Props) {
  const subtitleRight = `${user.phone} · ${user.timezone}`;

  return (
    <header
      className="sticky top-0 z-30 no-select"
      style={{
        background: "linear-gradient(180deg, rgba(26,16,8,0.97) 0%, rgba(26,16,8,0.88) 100%)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        borderBottom: "1px solid rgba(218,165,32,0.18)",
      }}
    >
      <div className="pt-safe">
        <div className="flex items-center justify-between px-4" style={{ height: 48 }}>
          <div className="flex items-center gap-2 min-w-0">
            <motion.div
              animate={online ? { opacity: [0.5, 1, 0.5] } : { opacity: 1 }}
              transition={online ? { duration: 2, repeat: Infinity } : {}}
              style={{
                width: 8, height: 8, borderRadius: "50%",
                background: online ? "#228B22" : "#8B1A1A",
                boxShadow: online ? "0 0 6px #228B22" : "none",
                flexShrink: 0,
              }}
            />
            <div className="min-w-0">
              <div
                className="font-typewriter text-[11px] tracking-[0.25em] uppercase truncate"
                style={{ color: "#DAA520", lineHeight: 1 }}
              >
                RZTelegrama
              </div>
              <div
                className="font-courier text-[9px] truncate"
                style={{ color: "#8a6a4a", marginTop: 2 }}
              >
                {user.name} · {subtitleRight}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <AnimatePresence>
              {sendStatus !== "idle" && (
                <motion.div
                  key={sendStatus}
                  initial={{ opacity: 0, scale: 0.7 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="font-typewriter text-[9px] tracking-wider px-2 py-0.5 rounded"
                  style={{
                    color: sendStatus === "delivered" ? "#90EE90" : "#DAA520",
                    border: `1px solid ${sendStatus === "delivered" ? "#228B22" : "#DAA520"}`,
                    background: "rgba(0,0,0,0.3)",
                  }}
                >
                  {sendStatus === "sending" ? "▲ ПЕРЕДАЧА" : "✓ ДОСТАВЛЕНО"}
                </motion.div>
              )}
            </AnimatePresence>
            {unreadCount > 0 && (
              <div
                className="font-typewriter text-[10px] font-bold rounded-full flex items-center justify-center"
                style={{
                  background: "#CC2200",
                  color: "#f5e8c8",
                  minWidth: 20, height: 20, padding: "0 6px",
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
