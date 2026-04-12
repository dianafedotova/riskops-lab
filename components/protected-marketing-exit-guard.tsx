"use client";

import {
  clearMarketingSurfaceSessionFlag,
  hasMarketingSurfaceSessionFlag,
} from "@/lib/public-data-layer";
import { useEffect, useRef } from "react";

export function ProtectedMarketingExitGuard() {
  const didForceReloadRef = useRef(false);

  useEffect(() => {
    if (didForceReloadRef.current) return;
    if (!hasMarketingSurfaceSessionFlag()) return;

    didForceReloadRef.current = true;
    clearMarketingSurfaceSessionFlag();
    window.location.replace(window.location.href);
  }, []);

  return null;
}
