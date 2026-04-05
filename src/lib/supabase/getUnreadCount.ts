import { createClient } from "./server";

/**
 * Fetch unread notification count for the current user.
 * Returns 0 if not authenticated or on error.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  try {
    const supabase = await createClient();
    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    return count ?? 0;
  } catch {
    return 0;
  }
}
