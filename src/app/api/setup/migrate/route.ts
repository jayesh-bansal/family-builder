import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * POST /api/setup/migrate
 * Checks if the migration needs to be run and runs key setup steps.
 *
 * NOTE: This cannot run DDL (CREATE FUNCTION, ALTER TABLE) via the REST API.
 * DDL must be run manually in Supabase SQL Editor.
 * This endpoint checks the migration status and returns instructions.
 */
export async function POST() {
  try {
    const supabase = await createClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if migration has been run
    const { error: rpcError } = await supabase.rpc("get_family_tree", {
      root_user_id: "00000000-0000-0000-0000-000000000000",
    });

    const migrationRun =
      !rpcError || !rpcError.message.includes("Could not find the function");

    return NextResponse.json({
      migrationRun,
      message: migrationRun
        ? "Migration already applied. Tree traversal is active."
        : "Migration needed. Run supabase/migrations/002_tree_traversal.sql in the Supabase SQL Editor.",
    });
  } catch (err) {
    console.error("Migration check error:", err);
    return NextResponse.json(
      { error: "Failed to check migration status" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const admin = createAdminClient();

    // Check if the RPC function exists
    const { error } = await admin.rpc("get_family_tree", {
      root_user_id: "00000000-0000-0000-0000-000000000000",
    });

    const migrationRun =
      !error || !error.message.includes("Could not find the function");

    return NextResponse.json({
      migrationRun,
      message: migrationRun
        ? "All good — tree traversal functions are active."
        : "Run supabase/migrations/002_tree_traversal.sql in the Supabase SQL Editor to enable full tree traversal.",
    });
  } catch (err) {
    return NextResponse.json({
      migrationRun: false,
      message:
        "Could not check migration status. Make sure SUPABASE_SERVICE_ROLE_KEY is set in .env.local",
    });
  }
}
