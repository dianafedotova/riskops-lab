"use client";

import { captureAmplitudeAttribution, initAmplitude } from "@/lib/amplitude";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export function AmplitudeProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    void initAmplitude();
  }, []);

  useEffect(() => {
    captureAmplitudeAttribution();
  }, [pathname, searchParams]);

  return null;
}
