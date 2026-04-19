"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDroppable, useDndContext } from "@dnd-kit/core";
import { formatDateInTZ, formatTimeInTZ } from "@/lib/tz";

interface MessageSlipData {
  id: string;
  content: string;
  senderName: string;
  senderPhone: string;
  createdAt: string;
}

interface FolderData {
  id: string;
  label: string;
  messages: MessageSlipData[];
}

interface FolderStackProps {
  folders: FolderData[];
  timezone: string;
  onCreateFolder: (label: string) => void;
  onPullFromFolder: (msgId: string, folderId: string) => void;
  onDeleteFromFolder: (msgId: string, folderId: string) => void;
}

function playFolderSound(opening: boolean) {
  try {
    const ctx = new AudioContext();
    if (opening) {
      for (let i = 0; i < 4; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(90 + Math.random() * 50, ctx.currentTime + i * 0.07);
        gain.gain.setValueAtTime(0.04, ctx.currentTime + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.07 + 0.1);
        osc.connect(gain); gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.07);
        osc.stop(ctx.currentTime + i * 0.07 + 0.1);
      }
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.setValueAtTime(180, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(55, ctx.currentTime + 0.09);
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.12);
    }
  } catch { /* audio not available */ }
}

function FolderCard({
  folder,
  onOpen,
}: {
  folder: FolderData;
  onOpen: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: folder.id });

  return (
    <motion.div
      ref={setNodeRef}
      whileHover={{ y: -4, rotate: 0.5 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => onOpen(folder.id)}
      className="relative cursor-pointer select-none"
      style={{ width: 110, flexShrink: 0 }}
    >
      {/* Tab */}
      <div
        style={{
          position: "absolute",
          top: -14,
          left: 10,
          width: 48,
          height: 16,
          background: isOver
            ? "#DAA520"
            : "linear-gradient(135deg, #c8b490, #a08860)",
          borderRadius: "4px 4px 0 0",
          border: "1px solid #8a7050",
          borderBottom: "none",
        }}
      />
      {/* Body */}
      <div
        style={{
          height: 100,
          background: isOver
            ? "linear-gradient(135deg, #DAA520, #B8860B)"
            : "linear-gradient(135deg, #c8b490 0%, #b09870 50%, #a08860 100%)",
          borderRadius: "2px 8px 4px 4px",
          boxShadow: "2px 4px 10px rgba(0,0,0,0.4)",
          border: "1px solid #8a7050",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          padding: "0 8px",
        }}
      >
        {folder.messages.length > 0 && (
          <div
            style={{
              width: 70,
              height: 12,
              background: "var(--paper-aged)",
              boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
              marginBottom: 2,
            }}
          />
        )}
        <div
          className="font-typewriter text-center"
          style={{ fontSize: 9, color: "#3a2a10", letterSpacing: "0.05em" }}
        >
          {folder.label}
        </div>
        <div
          className="font-typewriter"
          style={{ fontSize: 8, color: "#6a5030" }}
        >
          {folder.messages.length} л.
        </div>
        {folder.messages.length > 0 && (
          <div
            className="absolute top-1 right-1 rounded-full flex items-center justify-center font-typewriter"
            style={{ width: 16, height: 16, background: "#DAA520", color: "#1a1008", fontSize: 8 }}
          >
            {folder.messages.length}
          </div>
        )}
      </div>
    </motion.div>
  );
}

export function FolderStack({ folders, timezone, onCreateFolder, onPullFromFolder, onDeleteFromFolder }: FolderStackProps) {
  const { active } = useDndContext();
  const isDragging = active !== null;
  const [open, setOpen] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newLabel, setNewLabel] = useState("");

  const selectedFolder = selectedFolderId ? folders.find(f => f.id === selectedFolderId) ?? null : null;
  const totalMessages = folders.reduce((s, f) => s + f.messages.length, 0);

  function handleOpen() {
    playFolderSound(true);
    setOpen(true);
  }

  function handleClose() {
    playFolderSound(false);
    setOpen(false);
    setSelectedFolderId(null);
    setCreatingFolder(false);
    setNewLabel("");
  }

  function handleBack() {
    setSelectedFolderId(null);
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newLabel.trim()) return;
    onCreateFolder(newLabel.trim());
    setNewLabel("");
    setCreatingFolder(false);
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {/* Drag-target folder strip — appears above binder during drag */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              bottom: "100%",
              left: 0,
              right: 0,
              marginBottom: 8,
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              padding: "10px 12px",
              background: "rgba(26,16,8,0.88)",
              border: "1px solid #5a3a18",
              borderRadius: 6,
              backdropFilter: "blur(4px)",
              minWidth: 110,
              zIndex: 20,
            }}
          >
            {folders.length === 0 ? (
              <p className="font-typewriter text-[10px] w-full text-center" style={{ color: "#6a5030", padding: "4px 0" }}>
                Создай папку сначала
              </p>
            ) : (
              folders.map(folder => (
                <FolderCard key={folder.id} folder={folder} onOpen={() => {}} />
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Single binder on desk */}
      <motion.div
        className="relative cursor-pointer select-none"
        whileHover={{ scale: 1.03, rotate: -1 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleOpen}
        title="Папки"
        style={{ width: 110 }}
      >
        {/* Spine */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 18,
            background: "linear-gradient(180deg, #4a2a10, #2a1008, #3a1a08)",
            borderRadius: "4px 0 0 4px",
            zIndex: 2,
          }}
        >
          {/* Ring holes */}
          {[20, 60, 100].map(y => (
            <div
              key={y}
              style={{
                position: "absolute",
                left: "50%",
                top: y,
                transform: "translateX(-50%)",
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: "#1a0a04",
                border: "1px solid #5a3a18",
              }}
            />
          ))}
        </div>

        {/* Body */}
        <div
          style={{
            marginLeft: 16,
            height: 140,
            background: "linear-gradient(135deg, #c8b490 0%, #b09870 60%, #a08860 100%)",
            borderRadius: "0 6px 4px 0",
            boxShadow: "4px 6px 16px rgba(0,0,0,0.5)",
            border: "1px solid #8a7050",
            borderLeft: "none",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Stacked paper edges on right side */}
          {[0, 2, 4, 6].map(offset => (
            <div
              key={offset}
              style={{
                position: "absolute",
                right: -offset,
                top: 10,
                bottom: 10,
                width: 4,
                background: offset === 0 ? "#f0e8d0" : `rgba(240,232,208,${0.7 - offset * 0.1})`,
                borderRadius: "0 2px 2px 0",
              }}
            />
          ))}

          <div className="font-typewriter text-center" style={{ fontSize: 10, color: "#3a2a10", letterSpacing: "0.1em", lineHeight: 1.4 }}>
            ПАПКИ
          </div>
          <div className="font-typewriter" style={{ fontSize: 8, color: "#6a5030" }}>
            {folders.length} папок · {totalMessages} л.
          </div>

          {/* Badge */}
          {totalMessages > 0 && (
            <div
              className="absolute top-2 right-6 rounded-full flex items-center justify-center font-typewriter"
              style={{ width: 18, height: 18, background: "#DAA520", color: "#1a1008", fontSize: 9, fontWeight: "bold" }}
            >
              {totalMessages > 9 ? "9+" : totalMessages}
            </div>
          )}
        </div>

        <div className="font-typewriter text-center mt-1" style={{ fontSize: 9, color: "#DAA520", letterSpacing: "0.15em" }}>
          АРХИВ
        </div>
      </motion.div>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.7)" }}
            onClick={handleClose}
          >
            <motion.div
              initial={{ scale: 0.88, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.88, y: 16 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onClick={e => e.stopPropagation()}
              style={{
                width: 520,
                maxHeight: "76vh",
                background: "linear-gradient(135deg, #c8b490 0%, #b09870 100%)",
                borderRadius: "4px 10px 8px 8px",
                boxShadow: "8px 12px 40px rgba(0,0,0,0.6)",
                border: "1px solid #8a7050",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-3 flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #8a7050, #6a5030)", borderBottom: "2px solid #5a3a18" }}
              >
                <div className="flex items-center gap-3">
                  {selectedFolder && (
                    <button
                      onClick={handleBack}
                      className="font-typewriter text-xs tracking-wider uppercase px-2 py-1"
                      style={{ background: "rgba(0,0,0,0.2)", color: "#e8d8a0", border: "1px solid #5a4020", borderRadius: "3px", cursor: "pointer" }}
                    >
                      ← Назад
                    </button>
                  )}
                  <span className="font-typewriter tracking-widest uppercase text-sm" style={{ color: "#e8d8a0" }}>
                    {selectedFolder ? `📁 ${selectedFolder.label}` : "📂 Архив"}
                  </span>
                  {!selectedFolder && (
                    <span className="font-typewriter text-xs" style={{ color: "#b09060" }}>
                      {folders.length} папок
                    </span>
                  )}
                </div>
                <button
                  onClick={handleClose}
                  className="font-typewriter text-lg"
                  style={{ color: "#b09060", background: "none", border: "none", cursor: "pointer" }}
                >
                  ✕
                </button>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {selectedFolder ? (
                  /* Folder contents — ordered column */
                  selectedFolder.messages.length === 0 ? (
                    <p className="text-center font-typewriter text-xs py-8" style={{ color: "#6a5030" }}>
                      Папка пуста
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {[...selectedFolder.messages]
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                        .map((msg, i) => (
                          <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="flex gap-3 rounded"
                            style={{
                              background: "rgba(245,240,224,0.9)",
                              border: "1px solid #c8b080",
                              padding: "10px 12px",
                              boxShadow: "1px 2px 4px rgba(0,0,0,0.15)",
                            }}
                          >
                            {/* Date + sender */}
                            <div
                              className="flex-shrink-0 font-typewriter text-center"
                              style={{ width: 56, fontSize: 8, color: "#7a5a2a", lineHeight: 1.6 }}
                            >
                              <div style={{ fontSize: 9, fontWeight: "bold", color: "#5a3a10" }}>
                                {formatDateInTZ(msg.createdAt, timezone)}
                              </div>
                              <div>
                                {formatTimeInTZ(msg.createdAt, timezone)}
                              </div>
                              <div style={{ marginTop: 2, color: "#4a2a08", fontWeight: "bold" }}>
                                {msg.senderName}
                              </div>
                            </div>

                            {/* Divider */}
                            <div style={{ width: 1, background: "#c8b080", flexShrink: 0 }} />

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <p
                                className="font-courier text-[#1a1008]"
                                style={{ fontSize: 12, wordBreak: "break-word", overflowWrap: "break-word", lineHeight: 1.5 }}
                              >
                                {msg.content}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-1 flex-shrink-0 justify-center">
                              <button
                                onClick={() => onPullFromFolder(msg.id, selectedFolder.id)}
                                className="font-typewriter text-[9px] tracking-wide uppercase px-2 py-1"
                                style={{ background: "linear-gradient(135deg, #1a3a1a, #0a2a0a)", color: "#6aaa6a", border: "1px solid #2a4a2a", borderRadius: "3px", cursor: "pointer", whiteSpace: "nowrap" }}
                              >
                                ↑ Стол
                              </button>
                              <button
                                onClick={() => onDeleteFromFolder(msg.id, selectedFolder.id)}
                                className="font-typewriter text-[9px] uppercase px-2 py-1"
                                style={{ background: "linear-gradient(135deg, #3a1a1a, #2a0a0a)", color: "#aa6a6a", border: "1px solid #4a2a2a", borderRadius: "3px", cursor: "pointer" }}
                              >
                                🗑
                              </button>
                            </div>
                          </motion.div>
                        ))}
                    </div>
                  )
                ) : (
                  /* Folder list */
                  <>
                    {folders.length === 0 && !creatingFolder && (
                      <p className="text-center font-typewriter text-xs py-6" style={{ color: "#6a5030" }}>
                        Папок пока нет
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 mb-4">
                      {folders.map(folder => (
                        <FolderCard
                          key={folder.id}
                          folder={folder}
                          onOpen={setSelectedFolderId}
                        />
                      ))}

                      {/* Add folder button */}
                      {!creatingFolder && (
                        <motion.div
                          whileHover={{ y: -4 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setCreatingFolder(true)}
                          className="cursor-pointer"
                          style={{ width: 110 }}
                        >
                          <div
                            style={{
                              marginLeft: 0,
                              height: 100,
                              background: "rgba(200,180,144,0.25)",
                              borderRadius: "2px 8px 4px 4px",
                              border: "2px dashed #8a7050",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <span className="font-typewriter text-2xl" style={{ color: "#8a7050" }}>+</span>
                          </div>
                        </motion.div>
                      )}
                    </div>

                    {/* Create folder form */}
                    <AnimatePresence>
                      {creatingFolder && (
                        <motion.form
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          onSubmit={handleCreate}
                          className="flex gap-2 mt-2"
                        >
                          <input
                            type="text"
                            value={newLabel}
                            onChange={e => setNewLabel(e.target.value)}
                            placeholder="Название папки..."
                            autoFocus
                            className="flex-1 font-courier px-3 py-2 rounded focus:outline-none"
                            style={{ background: "rgba(255,255,255,0.5)", border: "1px solid #8a7050", fontSize: 13, color: "#1a1008" }}
                          />
                          <button
                            type="submit"
                            className="font-typewriter text-xs tracking-wider uppercase px-3 py-2"
                            style={{ background: "linear-gradient(135deg, #B8860B, #DAA520)", color: "#1a1008", border: "none", borderRadius: "4px", cursor: "pointer" }}
                          >
                            Создать
                          </button>
                          <button
                            type="button"
                            onClick={() => { setCreatingFolder(false); setNewLabel(""); }}
                            className="font-typewriter text-xs uppercase px-3 py-2"
                            style={{ background: "rgba(0,0,0,0.15)", color: "#5a4020", border: "1px solid #8a7050", borderRadius: "4px", cursor: "pointer" }}
                          >
                            Отмена
                          </button>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
