"use client";
import { useIsMobile } from "@/lib/useIsMobile";
import { DeskClient } from "./DeskClient";
import { MobileDeskClient } from "./MobileDeskClient";

interface User {
  id: string;
  name: string;
  phone: string;
  timezone: string;
  line: number;
}

export function ResponsiveDesk({ user }: { user: User }) {
  const isMobile = useIsMobile();

  // First paint: avoid flash of wrong layout. A tiny dark splash until we
  // know the viewport size.
  if (isMobile === null) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#1a1008",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Special Elite', monospace",
          color: "#DAA520",
          letterSpacing: "0.2em",
          fontSize: 12,
        }}
      >
        RZ...
      </div>
    );
  }

  return isMobile ? <MobileDeskClient user={user} /> : <DeskClient user={user} />;
}
