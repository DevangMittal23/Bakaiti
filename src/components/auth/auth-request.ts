export type AuthResponse = {
  success?: true;
  error?: string;
  retryAfter?: number;
  verificationRequired?: boolean;
};

type AuthAction = "signup" | "login" | "verify-signup" | "resend-signup";

export async function authRequest(action: AuthAction, body: Record<string, string>): Promise<AuthResponse> {
  const response = await fetch(`/api/auth/${action}`, {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result: AuthResponse = await response.json();
  if (!response.ok || result.error) {
    return {
      error: typeof result.error === "string" ? result.error : "We could not complete that request. Please try again.",
      retryAfter: typeof result.retryAfter === "number" ? result.retryAfter : undefined,
      verificationRequired: result.verificationRequired === true,
    };
  }
  if (result.success !== true) throw new Error("Unexpected authentication response");
  if ((action === "login" || action === "verify-signup") && typeof window !== "undefined") {
    window.dispatchEvent(new Event("bakaiti:auth-updated"));
  }
  return { success: true, retryAfter: result.retryAfter, verificationRequired: result.verificationRequired };
}
