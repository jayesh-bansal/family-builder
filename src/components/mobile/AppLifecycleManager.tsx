"use client";

import { useEffect, useRef } from "react";
import { isNative } from "@/lib/platform";

/**
 * Handles Capacitor app lifecycle events:
 * - Deep link navigation (invitation URLs opening the app)
 * - Status bar configuration
 *
 * No-op on web.
 */
export default function AppLifecycleManager() {
  const initialized = useRef(false);

  useEffect(() => {
    if (!isNative() || initialized.current) return;
    initialized.current = true;

    (async () => {
      try {
        const { App } = await import("@capacitor/app");

        // Handle deep links — when someone taps an invite URL
        App.addListener("appUrlOpen", (event) => {
          // event.url will be like: https://yourdomain.com/en/join/abc123
          const url = new URL(event.url);
          const path = url.pathname;

          // Navigate to the deep link path within the WebView
          if (path) {
            window.location.pathname = path;
          }
        });

        // Configure status bar
        const { StatusBar } = await import("@capacitor/status-bar");
        await StatusBar.setBackgroundColor({ color: "#8B5E3C" });
      } catch (err) {
        console.debug("App lifecycle setup:", err);
      }
    })();
  }, []);

  return null;
}
