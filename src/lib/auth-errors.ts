export type AuthActionResult = {
  success?: true;
  error?: string;
  verificationRequired?: boolean;
  retryAfter?: number;
  status?: number;
};

export function authFailure(error: { code?: string; status?: number } | null, fallback: string): AuthActionResult {
  if (error?.status === 429 || error?.code === "over_email_send_rate_limit" || error?.code === "over_request_rate_limit") {
    return { error: "Too many attempts. Please wait a minute and try again.", status: 429, retryAfter: 60 };
  }
  if (error?.status && error.status >= 500) {
    return { error: "Authentication is temporarily unavailable. Please try again later.", status: 503 };
  }
  return { error: fallback, status: 400 };
}
