"use client";

export type MobileTab = "chats" | "contacts" | "phone" | "more";

interface Props {
  tab: MobileTab;
  onChange: (tab: MobileTab) => void;
  unreadCount: number;
}

const TABS: { id: MobileTab; label: string; icon: string }[] = [
  { id: "chats", label: "Лента", icon: "📨" },
  { id: "contacts", label: "Книга", icon: "📇" },
  { id: "phone", label: "Телефон", icon: "☎" },
  { id: "more", label: "Ещё", icon: "⋯" },
];

export function MobileBottomNav({ tab, onChange, unreadCount }: Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 no-select"
      style={{
        background: "linear-gradient(180deg, #1a1008 0%, #0d0805 100%)",
        borderTop: "1px solid rgba(218,165,32,0.25)",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.6)",
      }}
    >
      <div className="pb-safe">
        <div className="flex" style={{ height: 60 }}>
          {TABS.map((t) => {
            const active = tab === t.id;
            const showBadge = t.id === "chats" && unreadCount > 0;
            return (
              <button
                key={t.id}
                onClick={() => onChange(t.id)}
                className="flex-1 flex flex-col items-center justify-center gap-0.5 tap-target"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  color: active ? "#DAA520" : "#6a5030",
                  position: "relative",
                  transition: "color 0.15s",
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    filter: active ? "drop-shadow(0 0 4px rgba(218,165,32,0.5))" : "none",
                  }}
                >
                  {t.icon}
                </span>
                <span
                  className="font-typewriter"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                  }}
                >
                  {t.label}
                </span>
                {active && (
                  <span
                    style={{
                      position: "absolute",
                      top: 0,
                      left: "30%",
                      right: "30%",
                      height: 2,
                      background: "linear-gradient(90deg, transparent, #DAA520, transparent)",
                    }}
                  />
                )}
                {showBadge && (
                  <span
                    className="font-typewriter text-[9px] font-bold rounded-full flex items-center justify-center"
                    style={{
                      position: "absolute",
                      top: 4,
                      right: "calc(50% - 20px)",
                      background: "#CC2200",
                      color: "#f5e8c8",
                      minWidth: 16,
                      height: 16,
                      padding: "0 4px",
                      border: "1px solid #1a1008",
                    }}
                  >
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
