"use client";

import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { loginSchema, type LoginFormData } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/shared/loading-spinner";
import { authRequest } from "./auth-request";
import { PasswordInput } from "./password-input";
import { SignupVerification } from "./signup-verification";

export function LoginForm() {
  const [isPending, setIsPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showVerification, setShowVerification] = useState(false);
  const inFlight = useRef(false);
  const router = useRouter();
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const openFeed = () => { router.replace("/feed"); router.refresh(); };

  const onSubmit = async (data: LoginFormData) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setIsPending(true);
    setFormError(null);
    try {
      const result = await authRequest("login", data);
      if (result.error) setFormError(result.error);
      else openFeed();
    } catch {
      setFormError("We could not sign you in. Check your connection and try again.");
    } finally {
      inFlight.current = false;
      setIsPending(false);
    }
  };

  if (showVerification) return <SignupVerification onBack={() => setShowVerification(false)} onVerified={openFeed} />;

  return (
    <form noValidate onSubmit={(event) => { void handleSubmit(onSubmit)(event); }} aria-busy={isPending} className="space-y-4">
      <div>
        <label htmlFor="login-username" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-text-secondary">Username</label>
        <input id="login-username" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required disabled={isPending} {...register("username")} aria-invalid={Boolean(errors.username)} aria-describedby="login-username-error" className="h-11 w-full rounded-lg border border-border bg-surface px-4 text-sm text-text-primary transition-colors focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60" placeholder="your_username" />
        <div id="login-username-error" className="min-h-6 pt-1.5 text-xs text-error">{errors.username && <p role="alert">{errors.username.message}</p>}</div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <label htmlFor="login-password" className="block text-xs font-semibold uppercase tracking-wider text-text-secondary">Password</label>
          <Link href="/forgot-password" className="inline-flex min-h-6 items-center rounded text-xs text-accent hover:text-accent-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Forgot password?</Link>
        </div>
        <PasswordInput id="login-password" autoComplete="current-password" required disabled={isPending} {...register("password")} aria-invalid={Boolean(errors.password)} aria-describedby="login-password-error" placeholder="Enter your password" />
        <div id="login-password-error" className="min-h-6 pt-1.5 text-xs text-error">{errors.password && <p role="alert">{errors.password.message}</p>}</div>
      </div>
      <div className="min-h-10 text-sm text-error" aria-live="polite">{formError && <p role="alert">{formError}</p>}</div>
      <Button type="submit" disabled={isPending} variant="glow" className="h-11 w-full font-semibold">
        {isPending ? <span className="flex items-center gap-2"><LoadingSpinner size="sm" />Signing in…</span> : "Sign in"}
      </Button>
      <button type="button" disabled={isPending} onClick={() => { setValue("password", ""); setShowVerification(true); }} className="min-h-11 w-full cursor-pointer rounded-lg text-xs text-text-secondary hover:text-text-primary active:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50">Verify a pending signup</button>
      <p className="text-center text-xs text-text-secondary">New to Bakaiti? <Link href="/signup" className="text-accent hover:text-accent-hover hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Create an account</Link></p>
    </form>
  );
}
