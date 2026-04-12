"use client";

import { useState, useEffect } from "react";
import { WifiOff } from "lucide-react";

/**
 * Shows a banner when the user is offline.
 * Auto-hides when connection is restored.
 */
export default function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);

    // Check initial state
    if (!navigator.onLine) setIsOffline(true);

    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-600 text-white text-center py-2 px-4 text-sm font-medium flex items-center justify-center gap-2 shadow-md">
      <WifiOff className="h-4 w-4 shrink-0" />
      <span>You are offline. Viewing cached data.</span>
    </div>
  );
}
