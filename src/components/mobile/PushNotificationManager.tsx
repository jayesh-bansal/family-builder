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
 *
 * IMPORTANT: Push registration (FCM/APNS) only runs when
 * NEXT_PUBLIC_PUSH_ENABLED=true is set. Without Firebase configured
 * (google-services.json), calling register() crashes the native app.
 * Without the flag, we only request permission and set up listeners
 * so the app is ready when Firebase is configured later.
 */
const PUSH_ENABLED = process.env.NEXT_PUBLIC_PUSH_ENABLED === "true";

export default function PushNotificationManager({
  userId,
}: PushNotificationManagerProps) {
  const registered = useRef(false);

  useEffect(() => {
    if (!isNative() || registered.current) return;
    registered.current = true;

    const timer = setTimeout(async () => {
      try {
        const { PushNotifications } = await import(
          "@capacitor/push-notifications"
        );

        // Check if push is available
        const checkResult = await PushNotifications.checkPermissions().catch(
          () => null
        );
        if (!checkResult) {
          console.debug("Push notifications not supported on this device");
          return;
        }

        // Request permission if not already granted
        let permStatus = checkResult.receive;
        if (permStatus !== "granted") {
          const permResult = await PushNotifications.requestPermissions();
          permStatus = permResult.receive;
        }
        if (permStatus !== "granted") return;

        // Set up listeners regardless — they're safe without FCM
        PushNotifications.addListener("registrationError", (error) => {
          console.debug("Push registration error:", error);
        });

        PushNotifications.addListener("registration", async (token) => {
          try {
            const supabase = createClient();
            const platform = getPlatform();
            await supabase.from("device_tokens").upsert(
              { user_id: userId, token: token.value, platform },
              { onConflict: "user_id,token" }
            );
          } catch (err) {
            console.debug("Failed to save device token:", err);
          }
        });

        PushNotifications.addListener(
          "pushNotificationReceived",
          (notification) => {
            console.log("Push received:", notification);
          }
        );

        PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (action) => {
            const data = action.notification.data;
            if (data?.url) {
              window.location.href = data.url;
            }
          }
        );

        // Only call register() if Firebase is configured — this is what
        // triggers FCM init and will crash without google-services.json
        if (PUSH_ENABLED) {
          await PushNotifications.register();
        } else {
          console.debug(
            "Push permission granted but registration skipped (NEXT_PUBLIC_PUSH_ENABLED not set)"
          );
        }
      } catch (err) {
        console.debug("Push notifications not available:", err);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [userId]);

  return null;
}
