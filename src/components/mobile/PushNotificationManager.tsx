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
 * No-op on web.
 */
export default function PushNotificationManager({
  userId,
}: PushNotificationManagerProps) {
  const registered = useRef(false);

  useEffect(() => {
    if (!isNative() || registered.current) return;
    registered.current = true;

    (async () => {
      try {
        const { PushNotifications } = await import(
          "@capacitor/push-notifications"
        );

        // Request permission
        const permResult = await PushNotifications.requestPermissions();
        if (permResult.receive !== "granted") return;

        // Register with APNS / FCM
        await PushNotifications.register();

        // Listen for token
        PushNotifications.addListener("registration", async (token) => {
          const supabase = createClient();
          const platform = getPlatform();

          // Upsert the device token
          await supabase.from("device_tokens").upsert(
            {
              user_id: userId,
              token: token.value,
              platform,
            },
            { onConflict: "user_id,token" }
          );
        });

        // Handle registration errors
        PushNotifications.addListener("registrationError", (error) => {
          console.error("Push registration failed:", error);
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
      } catch (err) {
        // Push notifications not available (web or plugin not installed)
        console.debug("Push notifications not available:", err);
      }
    })();
  }, [userId]);

  // This component renders nothing — it's a side-effect manager
  return null;
}
