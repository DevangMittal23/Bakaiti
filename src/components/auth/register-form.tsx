"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerSchema, type RegisterFormData } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { authRequest } from "./auth-request";
import { PasswordInput } from "./password-input";
import { SignupVerification } from "./signup-verification";

const inputClass = "h-11 w-full rounded-lg border border-border bg-surface px-4 text-sm text-text-primary transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60";
const labelClass = "mb-2 block text-xs font-semibold uppercase tracking-wider text-text-secondary";

export function RegisterForm() {
  const [isPending, setIsPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const inFlight = useRef(false);
  const router = useRouter();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<RegisterFormData>({ resolver: zodResolver(registerSchema) });

  const onSubmit = async (data: RegisterFormData) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsPending(true);
    setFormError(null);
    try {
      const result = await authRequest("signup", { email: data.email, password: data.password, username: data.username, display_name: data.display_name });
      if (result.error) setFormError(result.error);
      else {
        setValue("password", "");
        setValue("confirm_password", "");
        setVerificationEmail(data.email);
      }
    } catch {
      setFormError("We could not create your account. Check your connection and try again.");
    } finally {
      inFlight.current = false;
      setIsPending(false);
    }
  };

  if (verificationEmail) return <SignupVerification initialEmail={verificationEmail} codeSent onBack={() => setVerificationEmail(null)} backLabel="Back to signup" onVerified={() => { router.replace("/feed"); router.refresh(); }} />;

  return (
    <form noValidate onSubmit={(event) => { void handleSubmit(onSubmit)(event); }} aria-busy={isPending} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="signup-username" className={labelClass}>Username</label>
          <input id="signup-username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required disabled={isPending} {...register("username")} aria-invalid={Boolean(errors.username)} aria-describedby="signup-username-hint signup-username-error" className={inputClass} placeholder="your_username" />
          <p id="signup-username-hint" className="mt-1.5 text-xs text-text-secondary">You’ll use this to sign in.</p>
          <div id="signup-username-error" className="min-h-6 pt-1.5 text-xs text-error">{errors.username && <p role="alert">{errors.username.message}</p>}</div>
        </div>
        <div>
          <label htmlFor="signup-display-name" className={labelClass}>Display name</label>
          <input id="signup-display-name" type="text" autoComplete="nickname" required disabled={isPending} {...register("display_name")} aria-invalid={Boolean(errors.display_name)} aria-describedby="signup-display-name-error" className={inputClass} placeholder="Your name" />
          <div id="signup-display-name-error" className="min-h-6 pt-1.5 text-xs text-error">{errors.display_name && <p role="alert">{errors.display_name.message}</p>}</div>
        </div>
      </div>
      <div>
        <label htmlFor="signup-email" className={labelClass}>Email address</label>
        <input id="signup-email" type="email" autoComplete="email" required disabled={isPending} {...register("email")} aria-invalid={Boolean(errors.email)} aria-describedby="signup-email-error" className={inputClass} placeholder="you@example.com" />
        <div id="signup-email-error" className="min-h-6 pt-1.5 text-xs text-error">{errors.email && <p role="alert">{errors.email.message}</p>}</div>
      </div>
      <div>
        <label htmlFor="signup-password" className={labelClass}>Password</label>
        <PasswordInput id="signup-password" autoComplete="new-password" required disabled={isPending} {...register("password")} aria-invalid={Boolean(errors.password)} aria-describedby="signup-password-hint signup-password-error" placeholder="Create a password" />
        <p id="signup-password-hint" className="mt-1.5 text-xs text-text-secondary">Use at least 8 characters.</p>
        <div id="signup-password-error" className="min-h-6 pt-1.5 text-xs text-error">{errors.password && <p role="alert">{errors.password.message}</p>}</div>
      </div>
      <div>
        <label htmlFor="signup-confirm-password" className={labelClass}>Confirm password</label>
        <PasswordInput id="signup-confirm-password" visibilityLabel="confirmation password" autoComplete="new-password" required disabled={isPending} {...register("confirm_password")} aria-invalid={Boolean(errors.confirm_password)} aria-describedby="signup-confirm-password-error" placeholder="Repeat your password" />
        <div id="signup-confirm-password-error" className="min-h-6 pt-1.5 text-xs text-error">{errors.confirm_password && <p role="alert">{errors.confirm_password.message}</p>}</div>
      </div>
      <div className="min-h-10 text-sm text-error" aria-live="polite">{formError && <p role="alert">{formError}</p>}</div>
      <Button type="submit" disabled={isPending} variant="glow" className="h-11 w-full font-semibold">{isPending ? <span className="flex items-center gap-2"><LoadingSpinner size="sm" />Sending verification code…</span> : "Create account & verify email"}</Button>
      <p className="text-center text-xs text-text-secondary">Already have an account? <Link href="/login" className="text-accent hover:text-accent-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Sign in</Link></p>
    </form>
  );
}
