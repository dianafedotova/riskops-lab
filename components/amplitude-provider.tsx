"use client";

import { captureAmplitudeAttribution, initAmplitude, isAmplitudeEnabled } from "@/lib/amplitude";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function AmplitudeProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!isAmplitudeEnabled()) return;
    void initAmplitude();
  }, []);

  useEffect(() => {
    if (!isAmplitudeEnabled()) return;
    captureAmplitudeAttribution();
  }, [pathname, searchParams]);

  return null;
}
