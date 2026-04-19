"use client";
import { motion } from "framer-motion";

interface TeletypeProps {
  hasIncoming: boolean;
  onOpen: () => void;
  slotRef?: React.RefObject<HTMLDivElement>;
  isPrinting?: boolean;
  sendStatus?: "idle" | "sending" | "delivered";
}

export function Teletype({ hasIncoming, onOpen, slotRef, isPrinting, sendStatus = "idle" }: TeletypeProps) {
  return (
    <motion.div
      className="relative cursor-pointer select-none"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      animate={isPrinting ? { x: [0, -1.5, 1.5, -1, 1, 0] } : {}}
      transition={isPrinting ? { duration: 0.18, repeat: Infinity, repeatDelay: 0.05 } : {}}
      onClick={onOpen}
      title="Нажмите для работы с телетайпом"
    >
      {/* Main body */}
      <div
        className="relative rounded-md overflow-hidden"
        style={{
          width: 280,
          height: 200,
          background: "linear-gradient(180deg, #7a7a7a 0%, #5a5a5a 40%, #4a4a4a 100%)",
          boxShadow: "4px 8px 20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.1)",
          border: "2px solid #3a3a3a",
        }}
      >
        {/* Top panel with controls */}
        <div
          className="flex items-center justify-between px-4 py-2"
          style={{ background: "linear-gradient(180deg, #888 0%, #666 100%)", borderBottom: "2px solid #3a3a3a" }}
        >
          {/* Model label */}
          <div
            className="font-typewriter text-xs tracking-widest uppercase"
            style={{ color: "#daa520", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
          >
            RZ-T1
          </div>

          {/* Lamps */}
          <div className="flex items-center gap-3">
            {/* Incoming signal lamp */}
            <div className="flex items-center gap-1">
              <div
                className={`rounded-full ${hasIncoming ? "lamp-blink" : ""}`}
                style={{
                  width: 12,
                  height: 12,
                  background: hasIncoming ? "#ff3300" : "#550000",
                  boxShadow: hasIncoming ? "0 0 8px 4px #ff3300" : "none",
                  border: "1px solid #220000",
                }}
              />
              <span className="text-[8px] font-typewriter" style={{ color: "#777" }}>СИГ</span>
            </div>
            {/* Send status lamp */}
            <div className="flex items-center gap-1">
              <div
                className={`rounded-full ${sendStatus === "sending" ? "lamp-blink-amber" : ""}`}
                style={{
                  width: 12,
                  height: 12,
                  background: sendStatus === "delivered" ? "#22BB22" : sendStatus === "sending" ? "#DAA520" : "#1a1a00",
                  boxShadow: sendStatus === "delivered" ? "0 0 8px 4px #22BB22" : sendStatus === "sending" ? "0 0 6px 2px #DAA520" : "none",
                  border: "1px solid #222200",
                  transition: "background 0.3s, box-shadow 0.3s",
                }}
              />
              <span className="text-[8px] font-typewriter" style={{ color: "#777" }}>СВЯЗЬ</span>
            </div>
          </div>

          {/* Power button */}
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: 18,
              height: 18,
              background: "linear-gradient(135deg, #555, #333)",
              border: "2px solid #222",
              boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{ width: 6, height: 6, background: "#4CAF50", borderRadius: "50%" }} />
          </div>
        </div>

        {/* Paper output slot */}
        <div
          ref={slotRef}
          className="mx-auto mt-3 relative"
          style={{
            width: 200,
            height: 80,
            background: "#1a1a1a",
            borderRadius: "4px 4px 0 0",
            border: "2px solid #2a2a2a",
            borderBottom: "none",
            boxShadow: "inset 0 4px 12px rgba(0,0,0,0.8)",
          }}
        >
          {/* Paper coming out */}
          {hasIncoming && (
            <motion.div
              initial={{ height: 0, y: 80 }}
              animate={{ height: 40, y: 40 }}
              transition={{ duration: 0.5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
              className="absolute bottom-0 left-1/2 -translate-x-1/2"
              style={{
                width: 160,
                background: "linear-gradient(180deg, var(--paper-aged), var(--paper))",
                boxShadow: "0 -2px 6px rgba(0,0,0,0.3)",
              }}
            />
          )}
        </div>

        {/* Bottom keyboard-like area */}
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-1 pb-3 pt-2"
          style={{ background: "linear-gradient(0deg, #3a3a3a 0%, #4a4a4a 100%)" }}
        >
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 22,
                height: 14,
                background: i % 3 === 0 ? "#DAA520" : "linear-gradient(180deg, #666, #444)",
                borderRadius: "3px",
                border: "1px solid #222",
                boxShadow: "0 2px 3px rgba(0,0,0,0.4)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Label plate */}
      <div
        className="mt-1 text-center font-typewriter text-xs tracking-widest"
        style={{ color: "#DAA520" }}
      >
        ТЕЛЕТАЙП
      </div>
    </motion.div>
  );
}
