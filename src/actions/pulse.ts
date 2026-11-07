"use server";

import { createClient } from "@/lib/supabase/server";
import type { PulseType } from "@/types";

export async function setPulse(pulseType: PulseType) {
  if (!["chill", "active", "busy", "hyped"].includes(pulseType)) throw new Error("Choose a valid Pulse");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const expiresAt = new Date(
    Date.now() + 4 * 60 * 60 * 1000
  ).toISOString(); // 4 hours from now

  const { error } = await supabase
    .from("users")
    .update({
      pulse_type: pulseType,
      pulse_expires_at: expiresAt,
      pulse_set_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);

  return { pulseType, expiresAt };
}

export async function clearPulse() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("users")
    .update({
      pulse_type: null,
      pulse_expires_at: null,
      pulse_set_at: null,
    })
    .eq("id", user.id);

  if (error) throw new Error(error.message);
}

export async function getCurrentPulse(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("pulse_type, pulse_expires_at, pulse_set_at")
    .eq("id", userId)
    .single();

  if (error) throw new Error(error.message);

  // Client-side check: if expired but DB hasn't been cleaned yet, treat as null
  if (
    data.pulse_expires_at &&
    new Date(data.pulse_expires_at) < new Date()
  ) {
    return { pulse_type: null, pulse_expires_at: null, pulse_set_at: null };
  }

  return data;
}
