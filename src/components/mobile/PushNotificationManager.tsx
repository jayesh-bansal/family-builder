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

        // Request permission
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== "granted") return;

        // Listen for registration errors BEFORE calling register()
        PushNotifications.addListener("registrationError", (error) => {
          console.debug("Push registration failed (Firebase not configured?):", error);
        });

        // Listen for token
        PushNotifications.addListener("registration", async (token) => {
          try {
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

        // Register with APNS / FCM — this is what can crash without google-services.json
        await PushNotifications.register().catch((err) => {
          console.debug("Push register() failed:", err);
        });
      } catch (err) {
        // Plugin not available or other error — silently ignore
        console.debug("Push notifications not available:", err);
      }
    }, 3000); // 3 second delay so app loads first

    return () => clearTimeout(timer);
  }, [userId]);

  return null;
}
