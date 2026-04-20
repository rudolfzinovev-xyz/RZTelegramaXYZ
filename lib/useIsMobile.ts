"use client";
import { useEffect, useState } from "react";

export function useIsMobile(breakpoint = 768): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint);
    check();
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = () => check();
    mq.addEventListener("change", handler);
    window.addEventListener("resize", handler);
    return () => {
      mq.removeEventListener("change", handler);
      window.removeEventListener("resize", handler);
    };
  }, [breakpoint]);

  return isMobile;
}
