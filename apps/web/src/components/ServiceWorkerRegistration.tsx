"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js for offline-tolerant navigation and Web Push
 * handling. Registration failure is a silent no-op — both are progressive
 * enhancements, not requirements for the app to work.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Progressive enhancement — nothing to do if it fails.
      });
    }
  }, []);

  return null;
}
