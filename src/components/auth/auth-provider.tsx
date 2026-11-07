"use client";

import { useEffect, type ReactNode } from "react";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/auth-store";
import { useChatStore } from "@/stores/chat-store";
import { useNotificationStore } from "@/stores/notification-store";
import { useCallStore } from "@/stores/call-store";
import { useFeedStore } from "@/stores/feed-store";
import type { User } from "@/types";

export function AuthProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const supabase = createClient();
    let current = true;
    let revision = 0;
    const clearData = () => {
      useChatStore.getState().reset();
      useNotificationStore.getState().reset();
      useCallStore.getState().reset();
      useFeedStore.getState().reset();
    };
    const loadProfile = async (id: string | undefined) => {
      const request = ++revision;
      if (!current) return;
      const previousId = useAuthStore.getState().user?.id;
      // Initial profile hydration must preserve work loaded by authenticated children.
      // Clear account data only when leaving an established user or signing out.
      if (!id || (previousId && previousId !== id)) clearData();
      if (!id) {
        useAuthStore.getState().setUser(null);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("users")
          .select("*")
          .eq("id", id)
          .single();
        if (current && revision === request)
          useAuthStore.getState().setUser(error ? null : (data as User));
      } catch {
        if (current && revision === request)
          useAuthStore.getState().setUser(null);
      }
    };
    // One listener per application, regardless of how many cards read useAuth().
    const refresh = () => {
      void supabase.auth
        .getUser()
        .then(({ data }: { data: { user: { id: string } | null } }) =>
          loadProfile(data.user?.id),
        )
        .catch(() => loadProfile(undefined));
    };
    refresh();
    // Server API writes cookies; the browser SDK does not emit SIGNED_IN for that write.
    window.addEventListener("bakaiti:auth-updated", refresh);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
        if (event === "SIGNED_OUT") void loadProfile(undefined);
        else if (event === "SIGNED_IN" || event === "USER_UPDATED") {
          // Do not await another Auth operation while Supabase holds its callback lock.
          void loadProfile(session?.user.id);
        }
      },
    );
    return () => {
      current = false;
      revision++;
      subscription.unsubscribe();
      window.removeEventListener("bakaiti:auth-updated", refresh);
    };
  }, []);
  return children;
}
