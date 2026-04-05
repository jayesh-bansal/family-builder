"use client";

import { useEffect, useRef } from "react";
import { isNative, getPlatform } from "@/lib/platform";
import { createClient } from "@/lib/supabase/client";

interface PushNotificationManagerProps {
  userId: string;
}

/**
 * Registers for push notifications when running inside Capacitor.
 * Stores the device token in the device_tokens table.
 * Gracefully no-ops on web or when Firebase is not configured.
 */
export default function PushNotificationManager({
  userId,
}: PushNotificationManagerProps) {
  const registered = useRef(false);

  useEffect(() => {
    if (!isNative() || registered.current) return;
    registered.current = true;

    // Delay registration to avoid blocking app startup
    const timer = setTimeout(async () => {
      try {
        // Skip if a previous attempt already crashed / failed
        const PUSH_FAILED_KEY = "kutumb_push_failed";
        if (typeof localStorage !== "undefined" && localStorage.getItem(PUSH_FAILED_KEY)) {
          console.debug("Push registration skipped — previous attempt failed");
          return;
        }

        const { PushNotifications } = await import(
          "@capacitor/push-notifications"
        );

        // Check if push is available before requesting
        const checkResult = await PushNotifications.checkPermissions().catch(
          () => null
        );
        if (!checkResult) {
          console.debug("Push notifications not supported on this device");
          return;
        }

        // If already granted, only register listeners (no register() call without Firebase)
        // If not granted, request permission first
        let permStatus = checkResult.receive;
        if (permStatus !== "granted") {
          const permResult = await PushNotifications.requestPermissions();
          permStatus = permResult.receive;
        }
        if (permStatus !== "granted") return;

        // Listen for registration errors BEFORE calling register()
        PushNotifications.addListener("registrationError", (error) => {
          console.debug("Push registration failed (Firebase not configured?):", error);
          // Mark as failed so we don't crash on subsequent loads
          try { localStorage.setItem(PUSH_FAILED_KEY, "1"); } catch {}
        });

        // Listen for token
        PushNotifications.addListener("registration", async (token) => {
          try {
            // Clear failure flag on successful registration
            try { localStorage.removeItem(PUSH_FAILED_KEY); } catch {}

            const supabase = createClient();
            const platform = getPlatform();

            await supabase.from("device_tokens").upsert(
              {
                user_id: userId,
                token: token.value,
                platform,
              },
              { onConflict: "user_id,token" }
            );
          } catch (err) {
            console.debug("Failed to save device token:", err);
          }
        });

        // Handle received notifications (app in foreground)
        PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.log("Push received:", notification);
          }
        );

        // Handle notification tap (open specific page)
        PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            const data = action.notification.data;
            if (data?.url) {
              window.location.href = data.url;
            }
          }
        );

        // Mark as attempting before calling register() — if the app crashes
        // here, the flag persists and we skip next time
        try { localStorage.setItem(PUSH_FAILED_KEY, "1"); } catch {}

        // Register with APNS / FCM
        await PushNotifications.register();

        // If we get here, register() didn't crash — clear the flag
        // (success is handled in the "registration" listener)
      } catch (err) {
        // Plugin not available or other error — silently ignore
        console.debug("Push notifications not available:", err);
      }
    }, 3000); // 3 second delay so app loads first

    return () => clearTimeout(timer);
  }, [userId]);

  return null;
}
