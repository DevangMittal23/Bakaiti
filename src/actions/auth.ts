"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { loginSchema, signupSchema, signupCodeSchema, resendSignupSchema } from "@/lib/validations";
import { authFailure, type AuthActionResult } from "@/lib/auth-errors";

export async function signUp(formData: {
  email: string;
  password: string;
  username: string;
  display_name: string;
}): Promise<AuthActionResult> {
  const parsed = signupSchema.safeParse(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message, status: 400 };
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        username: parsed.data.username,
        display_name: parsed.data.display_name,
      },
    },
  });

  if (error) {
    const code = error.code && /^[a-z][a-z0-9_]{0,79}$/.test(error.code) ? error.code : "unknown";
    // Record only a bounded provider identifier/status; never raw messages or credentials.
    console.error("[auth:signup]", {
      code,
      status: error.status,
    });
    switch (error.code) {
      case "email_address_not_authorized":
        return { error: "Email delivery is restricted by the authentication service. Please contact support.", status: 503 };
      case "email_provider_disabled":
      case "signup_disabled":
        return { error: "New email accounts are currently disabled. Please contact support.", status: 503 };
      case "weak_password":
        return { error: "Your password does not meet the security requirements. Use a longer password with mixed letters, numbers and symbols.", status: 400 };
      case "email_address_invalid":
        return { error: "The authentication service rejected this email address. Use a real inbox you control; example or test domains may be rejected.", status: 400 };
      case "captcha_failed":
        return { error: "The security check could not be verified. Please try again or contact support.", status: 400 };
    }
    const failure = authFailure(error, "We could not complete signup. Please try again, or sign in if you registered earlier.");
    return process.env.NODE_ENV === "development"
      ? { ...failure, error: `${failure.error} (Auth code: ${code})` }
      : failure;
  }

  // Signup must not authenticate before the email code is checked.
  // An immediate session means Supabase's Confirm email setting is disabled.
  if (data.session) {
    await supabase.auth.signOut({ scope: "local" });
    return { error: "Email verification is not configured. Please contact support.", status: 503 };
  }

  return { success: true, verificationRequired: true, retryAfter: 60 };
}

export async function signIn(formData: {
  username: string;
  password: string;
}): Promise<AuthActionResult> {
  const parsed = loginSchema.safeParse(formData);
  if (!parsed.success) return { error: "Enter your username and password.", status: 400 };
  const supabase = await createClient();
  const invalidCredentials = { error: "Incorrect username or password.", status: 401 };
  try {
    // Supabase password auth uses an email internally. Resolve it server-side only;
    // no email column is added to the publicly readable users table.
    const admin = createAdminClient();
    const { data: profile, error: profileError } = await admin.from("users")
      .select("id").eq("username", parsed.data.username).maybeSingle();
    if (profileError) return { error: "Sign-in is temporarily unavailable. Please try again later.", status: 503 };
    let email = "invalid-login@bakaiti.invalid";
    if (profile) {
      const { data, error } = await admin.auth.admin.getUserById(profile.id);
      if (error) return { error: "Sign-in is temporarily unavailable. Please try again later.", status: 503 };
      email = data.user?.email ?? email;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: parsed.data.password });
    if (error?.code === "email_not_confirmed") {
      return { error: "Verify your signup email before signing in.", verificationRequired: true, status: 401 };
    }
    if (error) {
      const failure = authFailure(error, invalidCredentials.error);
      return { ...failure, status: failure.status === 400 ? 401 : failure.status };
    }
    if (!profile || !data.session || data.user?.id !== profile.id || !data.user.email_confirmed_at) {
      if (data.session) await supabase.auth.signOut({ scope: "local" });
      return invalidCredentials;
    }
    return { success: true };
  } catch {
    return { error: "Sign-in is temporarily unavailable. Please try again later.", status: 503 };
  }
}

export async function verifySignupCode(input: { email: string; token: string }): Promise<AuthActionResult> {
  const parsed = signupCodeSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message, status: 400 };
  const supabase = await createClient();
  // 'email' is the current recommended verification type for email confirmation tokens.
  const { data, error } = await supabase.auth.verifyOtp({ ...parsed.data, type: "email" });
  if (error) return authFailure(error, "That code is invalid or expired. Try again or request a new code.");
  if (!data.session || !data.user?.email_confirmed_at) {
    if (data.session) await supabase.auth.signOut({ scope: "local" });
    return { error: "Email verification could not be completed. Please request a new code.", status: 400 };
  }
  return { success: true };
}

export async function resendSignupCode(input: { email: string }): Promise<AuthActionResult> {
  const parsed = resendSignupSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0].message, status: 400 };
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({ type: "signup", email: parsed.data.email });
  if (error) return authFailure(error, "Unable to resend the signup code. Please try again later.");
  // Do not disclose whether the supplied email has an account awaiting verification.
  return { success: true, retryAfter: 60 };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function updatePassword(newPassword: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function resetPasswordForEmail(email: string) {
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/settings`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}
