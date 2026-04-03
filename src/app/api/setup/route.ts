import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  // Check if the RPC functions exist by calling them with a dummy UUID
  const { error } = await supabase.rpc("get_family_tree", {
    root_user_id: "00000000-0000-0000-0000-000000000000",
  });

  const migrationRun = !error || !error.message.includes("Could not find the function");

  return NextResponse.json({
    migrationRun,
    error: error?.message,
  });
}
