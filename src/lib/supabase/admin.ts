import "server-only";
import { createClient } from "@supabase/supabase-js";

// Never import from a client component or return an admin response to the browser.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Server authentication is not configured");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
