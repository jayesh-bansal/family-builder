/**
 * Platform detection utilities for Capacitor / Web.
 * Use these to conditionally enable native features.
 */

export function isCapacitor(): boolean {
  return (
    typeof window !== "undefined" && !!(window as any).Capacitor?.isNativePlatform
  );
}

export function isNative(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as any).Capacitor;
  return cap?.isNativePlatform?.() ?? false;
}

export function getPlatform(): "ios" | "android" | "web" {
  if (typeof window === "undefined") return "web";
  const cap = (window as any).Capacitor;
  if (cap?.getPlatform) {
    const p = cap.getPlatform();
    if (p === "ios" || p === "android") return p;
  }
  return "web";
}

export function isIOS(): boolean {
  return getPlatform() === "ios";
}

export function isAndroid(): boolean {
  return getPlatform() === "android";
}
