"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="mt-6">
      {error && (
        <p role="alert" className="mb-3 text-sm text-error">
          {error}
        </p>
      )}
      <Button
        variant="outline"
        disabled={pending}
        className="w-full border-error/30 text-error"
        onClick={async () => {
          if (pending) return;
          setPending(true);
          setError(null);
          try {
            await signOut();
            router.replace("/login");
            router.refresh();
          } catch {
            setError("Could not sign out. Please try again.");
          } finally {
            setPending(false);
          }
        }}
      >
        <LogOut className="h-4 w-4" />
        {pending ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}
