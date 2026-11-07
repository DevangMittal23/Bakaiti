"use client";

import { useConversations } from "@/hooks/use-conversations";
import { useNotifications } from "@/hooks/use-notifications";

// Navigation reads stores; load badge data once here instead of once per control.
export function NavigationSync() {
  useConversations();
  useNotifications();
  return null;
}
