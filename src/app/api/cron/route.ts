import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isCronAuthorized } from "@/lib/security/cron";

/**
 * Cron fallback endpoint for Pulse + Signal Score scheduled jobs.
 *
 * This endpoint is only needed if pg_cron is NOT available on your Supabase plan.
 * It should be called by an external cron service (e.g. cron-job.org) every 15 minutes.
 *
 * Setup:
 * 1. Add CRON_SECRET to your .env.local (any random string)
 * 2. GET /api/cron with Authorization: Bearer YOUR_CRON_SECRET every 15 minutes.
 *
 * What it does every 15 minutes:
 * - Expires stale pulses (where pulse_expires_at < now)
 *
 * What it does once daily (at the 3 AM UTC invocation):
 * - Recalculates all signal scores
 */

export async function GET(req: NextRequest) {
  if (!isCronAuthorized(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "Scheduler is not configured" }, { status: 503 });
  }

  // This client is server-only and independent of browser/session cookies.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  try {
    const { data, error } = await supabase.rpc("run_scheduled_maintenance");
    if (error) {
      console.error("Scheduled maintenance failed", error.code);
      return NextResponse.json({ error: "Scheduled maintenance failed", success: false }, { status: 500 });
    }
    return NextResponse.json({ success: true, results: data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Scheduled maintenance failed", success: false }, { status: 500 });
  }
}
