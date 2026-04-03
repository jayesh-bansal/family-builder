import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.banyan.app",
  appName: "Banyan",
  webDir: "out",
  server: {
    // Point to your deployed Next.js URL in production.
    // For local development, use your machine's IP:
    // url: "http://192.168.x.x:3000",
    // For production, set this to your deployed URL:
    url: "https://family-builder.vercel.app",
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#FFF8F0",
      showSpinner: false,
      launchAutoHide: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#8B5E3C",
    },
    Keyboard: {
      resize: "body",
      resizeOnFullScreen: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
  // Deep links for invitation URLs
  // Configure associated domains in Xcode for iOS
  // Configure intent filters in AndroidManifest.xml for Android
};

export default config;
