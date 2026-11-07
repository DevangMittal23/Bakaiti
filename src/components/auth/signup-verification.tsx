"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { forgotPasswordSchema } from "@/lib/validations";
import { authRequest } from "./auth-request";
import { PasswordInput } from "./password-input";

type SignupVerificationProps = {
  initialEmail?: string;
  codeSent?: boolean;
  onBack: () => void;
  onVerified: () => void;
  backLabel?: string;
};

export function SignupVerification({ initialEmail = "", codeSent = false, onBack, onVerified, backLabel = "Back to sign in" }: SignupVerificationProps) {
  const [email, setEmail] = useState(initialEmail);
  const [hasCode, setHasCode] = useState(codeSent);
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState<"verify" | "resend" | null>(null);
  const [remaining, setRemaining] = useState(codeSent ? 60 : 0);
  const [deadline, setDeadline] = useState(() => codeSent ? Date.now() + 60_000 : 0);
  const inFlight = useRef(false);
  const codeInput = useRef<HTMLInputElement>(null);
  const emailInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!deadline) return;
    const timer = setInterval(() => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) clearInterval(timer);
    }, 250);
    return () => clearInterval(timer);
  }, [deadline]);

  useEffect(() => {
    if (pending) return;
    if (hasCode) codeInput.current?.focus();
    else emailInput.current?.focus();
  }, [hasCode, pending]);

  const startCooldown = (seconds = 60) => {
    const wait = Math.max(1, Math.min(Math.ceil(seconds), 3600));
    setRemaining(wait);
    setDeadline(Date.now() + wait * 1000);
  };

  const sendCode = async () => {
    if (inFlight.current || remaining > 0) return;
    const parsed = forgotPasswordSchema.safeParse({ email: email.trim() });
    if (!parsed.success) {
      setEmailError("Enter a valid email address.");
      emailInput.current?.focus();
      return;
    }
    inFlight.current = true;
    setPending("resend");
    setError(null);
    setEmailError(null);
    setCodeError(null);
    setStatus("");
    try {
      const result = await authRequest("resend-signup", { email: parsed.data.email });
      if (result.error) {
        setError(result.error);
        if (result.retryAfter) startCooldown(result.retryAfter);
        return;
      }
      setEmail(parsed.data.email);
      setHasCode(true);
      setToken("");
      startCooldown(result.retryAfter);
      setStatus("If this email has a pending signup, its verification code is on the way.");
      codeInput.current?.focus();
    } catch {
      setError("We could not send the code. Check your connection and try again.");
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  };

  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    if (!/^\d{6}$/.test(token)) {
      setCodeError("Enter the 6-digit code from your email.");
      codeInput.current?.focus();
      return;
    }
    inFlight.current = true;
    setPending("verify");
    setError(null);
    setCodeError(null);
    setStatus("");
    try {
      const result = await authRequest("verify-signup", { email, token });
      if (result.error) {
        setCodeError(result.error);
        codeInput.current?.focus();
        return;
      }
      setToken("");
      setStatus("Email verified. Opening Bakaiti…");
      onVerified();
    } catch {
      setError("We could not verify the code. Check your connection and try again.");
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  };

  const busy = pending !== null;

  return (
    <section aria-labelledby="verification-heading" className="space-y-4">
      <button type="button" onClick={onBack} disabled={busy} className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg text-sm text-text-secondary hover:text-text-primary active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />{backLabel}
      </button>
      <div>
        <MailCheck className="mb-3 h-7 w-7 text-accent" aria-hidden="true" />
        <h3 id="verification-heading" className="text-xl font-semibold text-text-primary">{hasCode ? "Check your email" : "Verify your signup"}</h3>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          {hasCode ? <>Enter the signup code sent to <span className="break-all font-medium text-text-primary">{email}</span>.</> : "Enter the email you used when creating your account to request a new verification code."}
        </p>
      </div>

      {hasCode ? (
        <form noValidate onSubmit={verifyCode} aria-busy={busy} className="space-y-3">
          <div>
            <label htmlFor="signup-otp" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Verification code</label>
            <PasswordInput id="signup-otp" ref={codeInput} visibilityLabel="verification code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required value={token} disabled={busy}
              onChange={(event) => { setToken(event.target.value.replace(/\D/g, "").slice(0, 6)); setCodeError(null); }}
              aria-invalid={Boolean(codeError)} aria-describedby="signup-otp-hint signup-otp-error" className="text-center font-mono text-lg tracking-[0.35em]" placeholder="••••••" />
            <p id="signup-otp-hint" className="mt-2 text-xs leading-relaxed text-text-secondary">Paste the 6-digit code. If it has expired, request a new one below.</p>
            <div id="signup-otp-error" className="min-h-8 pt-1.5 text-xs text-error" aria-live="polite">{codeError && <p role="alert">{codeError}</p>}</div>
          </div>
          <Button type="submit" variant="glow" className="h-11 w-full font-semibold" disabled={busy}>
            {pending === "verify" ? <span className="flex items-center gap-2"><LoadingSpinner size="sm" />Verifying…</span> : "Verify email & continue"}
          </Button>
          <Button type="button" variant="outline" className="h-11 w-full" onClick={sendCode} disabled={busy || remaining > 0}>
            {pending === "resend" ? <span className="flex items-center gap-2"><LoadingSpinner size="sm" />Sending…</span> : remaining > 0 ? `Resend code in ${remaining}s` : "Resend code"}
          </Button>
        </form>
      ) : (
        <form noValidate onSubmit={(event) => { event.preventDefault(); void sendCode(); }} aria-busy={busy} className="space-y-3">
          <div>
            <label htmlFor="verification-email" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Signup email</label>
            <input id="verification-email" ref={emailInput} type="email" autoComplete="email" required value={email} disabled={busy} onChange={(event) => { setEmail(event.target.value); setEmailError(null); }} aria-invalid={Boolean(emailError)} aria-describedby="verification-email-error" className="h-11 w-full rounded-lg border border-border bg-surface px-4 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60" placeholder="you@example.com" />
            <div id="verification-email-error" className="min-h-8 pt-1.5 text-xs text-error" aria-live="polite">{emailError && <p role="alert">{emailError}</p>}</div>
          </div>
          <Button type="submit" variant="glow" className="h-11 w-full font-semibold" disabled={busy || remaining > 0}>
            {pending === "resend" ? <span className="flex items-center gap-2"><LoadingSpinner size="sm" />Sending…</span> : remaining > 0 ? `Try again in ${remaining}s` : "Send verification code"}
          </Button>
        </form>
      )}

      <div className="min-h-10 text-xs leading-relaxed" aria-live="polite">
        {error ? <p role="alert" className="text-error">{error}</p> : <p className="text-text-secondary" role="status">{status}</p>}
      </div>
    </section>
  );
}
