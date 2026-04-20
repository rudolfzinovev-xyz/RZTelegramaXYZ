"use client";
import { motion } from "framer-motion";

interface Props {
  hasIncoming: boolean;
  unreadCount: number;
  latestSender?: string;
  sendStatus: "idle" | "sending" | "delivered";
  onOpenLatest: () => void;
}

export function MobileTeletype({
  hasIncoming, unreadCount, latestSender, sendStatus, onOpenLatest,
}: Props) {
  return (
    <motion.button
      className="relative select-none mx-auto block"
      whileTap={hasIncoming ? { scale: 0.98 } : undefined}
      animate={hasIncoming ? { x: [0, -1, 1, -1, 1, 0] } : {}}
      transition={hasIncoming ? { duration: 0.22, repeat: Infinity, repeatDelay: 0.08 } : {}}
      onClick={hasIncoming ? onOpenLatest : undefined}
      disabled={!hasIncoming}
      aria-label={hasIncoming ? "Забрать входящее" : "Телетайп"}
      style={{
        width: "calc(100% - 32px)",
        maxWidth: 340,
        padding: 0,
        background: "transparent",
        border: "none",
        cursor: hasIncoming ? "pointer" : "default",
      }}
    >
      {/* Machine body */}
      <div
        className="relative rounded-md overflow-hidden"
        style={{
          width: "100%",
          background: "linear-gradient(180deg, #7a7a7a 0%, #5a5a5a 40%, #4a4a4a 100%)",
          boxShadow: "0 6px 18px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
          border: "2px solid #3a3a3a",
        }}
      >
        {/* Top panel with controls */}
        <div
          className="flex items-center justify-between px-3 py-2"
          style={{
            background: "linear-gradient(180deg, #888 0%, #666 100%)",
            borderBottom: "2px solid #3a3a3a",
          }}
        >
          <div
            className="font-typewriter tracking-widest uppercase"
            style={{
              color: "#daa520",
              fontSize: 10,
              textShadow: "0 1px 2px rgba(0,0,0,0.5)",
            }}
          >
            RZ-T1
          </div>

          <div className="flex items-center gap-3">
            {/* Incoming signal lamp */}
            <div className="flex items-center gap-1">
              <div
                className={`rounded-full ${hasIncoming ? "lamp-blink" : ""}`}
                style={{
                  width: 10,
                  height: 10,
                  background: hasIncoming ? "#ff3300" : "#550000",
                  boxShadow: hasIncoming ? "0 0 7px 3px #ff3300" : "none",
                  border: "1px solid #220000",
                }}
              />
              <span className="font-typewriter" style={{ fontSize: 7, color: "#777" }}>
                СИГ
              </span>
            </div>
            {/* Send status lamp */}
            <div className="flex items-center gap-1">
              <div
                className={`rounded-full ${sendStatus === "sending" ? "lamp-blink-amber" : ""}`}
                style={{
                  width: 10,
                  height: 10,
                  background:
                    sendStatus === "delivered"
                      ? "#22BB22"
                      : sendStatus === "sending"
                      ? "#DAA520"
                      : "#1a1a00",
                  boxShadow:
                    sendStatus === "delivered"
                      ? "0 0 7px 3px #22BB22"
                      : sendStatus === "sending"
                      ? "0 0 5px 2px #DAA520"
                      : "none",
                  border: "1px solid #222200",
                  transition: "background 0.3s, box-shadow 0.3s",
                }}
              />
              <span className="font-typewriter" style={{ fontSize: 7, color: "#777" }}>
                СВЯЗЬ
              </span>
            </div>
          </div>

          {/* Power indicator */}
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: 16,
              height: 16,
              background: "linear-gradient(135deg, #555, #333)",
              border: "2px solid #222",
              boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ width: 5, height: 5, background: "#4CAF50", borderRadius: "50%" }} />
          </div>
        </div>

        {/* Paper output slot */}
        <div
          className="mx-auto mt-3 relative overflow-hidden"
          style={{
            width: "72%",
            height: 72,
            background: "#1a1a1a",
            borderRadius: "4px 4px 0 0",
            border: "2px solid #2a2a2a",
            borderBottom: "none",
            boxShadow: "inset 0 4px 12px rgba(0,0,0,0.8)",
          }}
        >
          {/* Paper coming out with snippet */}
          {hasIncoming ? (
            <motion.div
              initial={{ y: 72 }}
              animate={{ y: 16 }}
              transition={{ type: "spring", stiffness: 120, damping: 18 }}
              className="absolute bottom-0 left-1/2 -translate-x-1/2"
              style={{
                width: "92%",
                height: 56,
                background: "linear-gradient(180deg, var(--paper-aged, #e8dfc8), var(--paper, #f5f0e8))",
                boxShadow: "0 -2px 6px rgba(0,0,0,0.3)",
                padding: "4px 8px",
                textAlign: "left",
                overflow: "hidden",
              }}
            >
              <div
                className="font-courier"
                style={{
                  fontSize: 8,
                  color: "#5a4020",
                  letterSpacing: "0.05em",
                  lineHeight: 1.3,
                }}
              >
                {String(unreadCount).padStart(3, "0")} ВХОД.
              </div>
              <div
                className="font-courier truncate"
                style={{
                  fontSize: 10,
                  color: "#1a1008",
                  fontWeight: "bold",
                  marginTop: 2,
                  letterSpacing: "0.03em",
                }}
              >
                ОТ: {latestSender || "—"}
              </div>
              <div
                className="font-typewriter"
                style={{
                  fontSize: 8,
                  color: "#8B1A1A",
                  marginTop: 2,
                  letterSpacing: "0.15em",
                }}
              >
                ▶ НАЖМИТЕ ЧТОБЫ ПРОЧЕСТЬ
              </div>
            </motion.div>
          ) : (
            <div
              className="absolute inset-0 flex items-center justify-center font-typewriter"
              style={{ color: "#333", fontSize: 9, letterSpacing: "0.25em" }}
            >
              ЛЕНТА ПУСТА
            </div>
          )}
        </div>

        {/* Keys strip */}
        <div
          className="flex items-center justify-center gap-1 pb-3 pt-2"
          style={{ background: "linear-gradient(0deg, #3a3a3a 0%, #4a4a4a 100%)" }}
        >
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 18,
                height: 12,
                background: i % 3 === 0 ? "#DAA520" : "linear-gradient(180deg, #666, #444)",
                borderRadius: 3,
                border: "1px solid #222",
                boxShadow: "0 2px 3px rgba(0,0,0,0.4)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Label */}
      <div
        className="mt-1 text-center font-typewriter tracking-widest"
        style={{ color: "#DAA520", fontSize: 10 }}
      >
        ТЕЛЕТАЙП
      </div>
    </motion.button>
  );
}
