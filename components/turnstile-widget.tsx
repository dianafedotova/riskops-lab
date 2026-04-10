"use client";

import { useEffect, useId, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        target: HTMLElement,
        options: {
          sitekey: string;
          theme?: "light" | "dark" | "auto";
          callback?: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

let turnstileScriptPromise: Promise<void> | null = null;

function ensureTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (turnstileScriptPromise) return turnstileScriptPromise;

  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-turnstile-script="1"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Could not load Turnstile.")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.turnstileScript = "1";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Turnstile."));
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

type TurnstileWidgetProps = {
  siteKey: string;
  onTokenChange: (token: string | null) => void;
};

export function TurnstileWidget({ siteKey, onTokenChange }: TurnstileWidgetProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const descriptionId = useId();

  useEffect(() => {
    if (!siteKey) return;

    let active = true;
    void ensureTurnstileScript()
      .then(() => {
        if (!active || !mountRef.current || !window.turnstile || widgetIdRef.current) return;
        widgetIdRef.current = window.turnstile.render(mountRef.current, {
          sitekey: siteKey,
          theme: "light",
          callback: (token) => {
            setLoadError(null);
            onTokenChange(token);
          },
          "expired-callback": () => {
            onTokenChange(null);
          },
          "error-callback": () => {
            onTokenChange(null);
            setLoadError("Captcha could not load. Refresh the page and try again.");
          },
        });
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Captcha could not load.");
        onTokenChange(null);
      });

    return () => {
      active = false;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [onTokenChange, siteKey]);

  if (!siteKey) return null;

  return (
    <div className="space-y-2">
      <div ref={mountRef} aria-describedby={descriptionId} />
      <p id={descriptionId} className="text-xs text-[var(--accent-stone-500)]">
        Complete the captcha to continue with public beta signup and password recovery.
      </p>
      {loadError ? <p className="text-xs text-rose-600">{loadError}</p> : null}
    </div>
  );
}
