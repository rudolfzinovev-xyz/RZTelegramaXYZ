"use client";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatInTZ } from "@/lib/tz";

let printAudioCtx: AudioContext | null = null;

function playPrintClick() {
  try {
    if (!printAudioCtx) printAudioCtx = new AudioContext();
    const ctx = printAudioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(700 + Math.random() * 250, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.045);
    gain.gain.setValueAtTime(0.07, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.045);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.045);
  } catch { /* audio not available */ }
}

function playTearSound() {
  try {
    const ctx = new AudioContext();
    for (let i = 0; i < 12; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200 + Math.random() * 3000, ctx.currentTime + i * 0.012);
      gain.gain.setValueAtTime(0.04, ctx.currentTime + i * 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.012 + 0.08);
      osc.start(ctx.currentTime + i * 0.012);
      osc.stop(ctx.currentTime + i * 0.012 + 0.08);
    }
  } catch { /* audio not available */ }
}

function addLineNumbers(text: string): string {
  return text.split("\n").map((line, i) => `${String(i + 1).padStart(3, "0")} ${line}`).join("\n");
}

interface MessageData {
  id: string;
  content: string;
  senderName: string;
  senderPhone: string;
  senderTimezone?: string;
  createdAt: string;
}

interface PaperStripProps {
  message: MessageData | null;
  onTear: (message: MessageData) => void;
  onDismiss: () => void;
  slotTop: number;
  slotLeft: number;
  timezone: string;
}

const COLLAPSE_CHARS = 120;

export function PaperStrip({ message, onTear, onDismiss, slotTop, slotLeft, timezone }: PaperStripProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [printing, setPrinting] = useState(false);
  const [done, setDone] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!message) {
      setDisplayedText("");
      setPrinting(false);
      setDone(false);
      setExpanded(false);
      return;
    }

    const fullText = message.content;
    let index = 0;
    setDisplayedText("");
    setPrinting(true);
    setDone(false);
    setExpanded(false);

    const printNext = () => {
      if (index >= fullText.length) {
        setPrinting(false);
        setDone(true);
        return;
      }
      index++;
      setDisplayedText(fullText.slice(0, index));
      playPrintClick();

      const char = fullText[index - 1];
      // Pause longer on word boundaries for realism
      const delay = char === " " || char === "\n" ? 160 : 45;
      timeoutRef.current = setTimeout(printNext, delay);
    };

    timeoutRef.current = setTimeout(printNext, 50);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [message?.id]);

  if (!message) return null;

  const isLong = done && message.content.length > COLLAPSE_CHARS;
  const bodyText = isLong && !expanded
    ? displayedText.slice(0, COLLAPSE_CHARS) + "…"
    : displayedText;

  const numberedText = addLineNumbers(bodyText);

  const header = `ОТ: ${message.senderName}\n${message.senderPhone}${message.senderTimezone ? ` [${message.senderTimezone}]` : ""}\nДАТА: ${formatInTZ(message.createdAt, timezone)}\n`;

  return (
    <div
      className="absolute z-30"
      style={{ top: slotTop, left: slotLeft - 20, width: 240 }}
    >
      {/* Outer wrapper with perforation strips */}
      <div style={{ position: "relative", display: "flex" }}>
        {/* Left perforation strip */}
        <div
          style={{
            width: 20,
            flexShrink: 0,
            background: "linear-gradient(180deg, var(--paper) 0%, var(--paper-aged) 100%)",
            backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.35) 3.5px, transparent 3.5px)",
            backgroundSize: "20px 18px",
            backgroundPosition: "10px 6px",
            borderRight: "1px dashed rgba(100,70,30,0.3)",
          }}
        />

        {/* Paper content */}
        <div
          style={{
            flex: 1,
            background: "linear-gradient(180deg, var(--paper), var(--paper-aged))",
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
          }}
        >
          <div
            className="p-3 font-courier text-xs text-[#1a1008] whitespace-pre-wrap"
            style={{ lineHeight: 1.6, wordBreak: "break-word", overflowWrap: "break-word" }}
          >
            {header}
            {numberedText}
            {printing && (
              <motion.span
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.4, repeat: Infinity }}
                style={{
                  display: "inline-block",
                  width: 7,
                  height: 11,
                  background: "#1a1008",
                  verticalAlign: "text-bottom",
                }}
              />
            )}
          </div>

          {isLong && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="w-full py-1 font-typewriter text-[10px] tracking-wider uppercase"
              style={{
                background: "rgba(0,0,0,0.06)",
                color: "#5a4020",
                border: "none",
                borderTop: "1px dashed #8a7050",
                cursor: "pointer",
              }}
            >
              {expanded ? "▲ Свернуть" : "▼ Развернуть"}
            </button>
          )}
        </div>

        {/* Right perforation strip */}
        <div
          style={{
            width: 20,
            flexShrink: 0,
            background: "linear-gradient(180deg, var(--paper) 0%, var(--paper-aged) 100%)",
            backgroundImage: "radial-gradient(circle, rgba(0,0,0,0.35) 3.5px, transparent 3.5px)",
            backgroundSize: "20px 18px",
            backgroundPosition: "10px 6px",
            borderLeft: "1px dashed rgba(100,70,30,0.3)",
          }}
        />
      </div>

      {/* Perforation line + tear button */}
      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div style={{ display: "flex" }}>
              {/* Left perf on tear bar */}
              <div style={{ width: 20, background: "rgba(200,180,150,0.4)", borderRight: "1px dashed rgba(100,70,30,0.3)" }} />
              <div
                style={{
                  flex: 1,
                  height: 8,
                  background: "repeating-linear-gradient(90deg, var(--paper-aged) 0px, var(--paper-aged) 6px, transparent 6px, transparent 10px)",
                  borderTop: "1px dashed #8a7050",
                  borderBottom: "1px solid #8a7050",
                }}
              />
              <div style={{ width: 20, background: "rgba(200,180,150,0.4)", borderLeft: "1px dashed rgba(100,70,30,0.3)" }} />
            </div>

            <div style={{ display: "flex" }}>
              <div style={{ width: 20, background: "#6a5030" }} />
              <button
                onClick={() => { playTearSound(); onTear(message); }}
                className="flex-1 py-2 font-typewriter text-xs tracking-widest uppercase"
                style={{
                  background: "linear-gradient(135deg, #8a7050, #5a4020)",
                  color: "#f5f0e8",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                ✂ Вырвать
              </button>
              <div style={{ width: 20, background: "#6a5030" }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
