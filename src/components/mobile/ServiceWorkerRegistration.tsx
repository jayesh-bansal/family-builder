"use client";

import { useEffect } from "react";

/**
 * Registers the service worker for offline caching.
 * Placed in the root layout so it runs on every page.
 */
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.debug("SW registered:", reg.scope);

        // Auto-update on new version
        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "activated") {
                console.debug("SW updated — new cache active");
              }
            });
          }
        });
      })
      .catch((err) => {
        console.debug("SW registration skipped:", err.message);
      });
  }, []);

  return null;
}
