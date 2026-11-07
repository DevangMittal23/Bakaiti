# Signup email codes and username login

Bakaiti uses Supabase Auth for password hashes, email verification codes and session cookies. New users choose a username/password and verify their email with a six-digit code. Subsequent logins use username/password without sending an email code. No custom OTP tables or SMTP library are required.

## Use one project for the URL, keys and dashboard settings

The active Bakaiti project is `yiwizdahpvklgqojsqug`. On 2026-11-07, the app's URL/public key still targeted the older `vynsfpnkvffnkdkhmlkk` project while the new Secret key and saved confirmation/SMTP settings belonged to Bakaiti. This caused both the rejected server key and misleading auto-confirmation/duplicate-account results.

The local `.env.local` URL and public key were aligned with Bakaiti, preserving the Secret key already entered by the user. Live checks now return HTTP200 for the public Auth settings, server profile lookup and Auth admin API. Email signup and Confirm email are enabled. The running app's nonexistent-user login probe now returns the expected generic HTTP401 instead of configuration HTTP503.

Always obtain all three values from the same dashboard project:

| App variable | Dashboard value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://yiwizdahpvklgqojsqug.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | This project's Publishable key (the variable retains its existing name) |
| `SUPABASE_SERVICE_ROLE_KEY` | This project's server-only Secret key (the variable retains its existing name) |

Refresh the app after changing projects so its browser client reads the new public configuration. Before the user's new signup test, Bakaiti had no Auth accounts or public profiles; accounts created during the earlier attempts belong to the old project.

**Live acceptance completed on 2026-11-07:** the user received the OTP, verified it, signed out and signed in again using username/password. A read-only check confirms `dm_host` has a matching Auth account/public profile, confirmed email and recorded sign-in in Bakaiti. Wrong/expired/reused codes, resend limits and longer-lived session behavior remain release checks.

## Free SMTP: Brevo with a Gmail sender

Verified against provider documentation on 2026-11-03. Brevo's Free plan includes **300 email sends per day**, including transactional emails. Configure it in Supabase; the application already uses Supabase's email/OTP flow.

1. Create a [free Brevo account](https://www.brevo.com/) and complete its account verification/transactional activation if requested.
2. In Brevo, open **Settings → Senders, Domains & Dedicated IPs → Senders**. Add the sender name `Bakaiti` and a Gmail address you control; complete the verification email sent to that address.
3. Open **Settings → SMTP & API → SMTP** ([SMTP settings](https://app.brevo.com/settings/keys/smtp)). Copy the exact **SMTP login** displayed there and generate an **SMTP key**. This key is different from a Brevo API key and from your Gmail password.
4. In Supabase, open **Authentication → Emails → SMTP Settings** and enable custom SMTP. Replace the previous Gmail SMTP connection with:

   | Setting | Value |
   | --- | --- |
   | Host | `smtp-relay.brevo.com` |
   | Port | `587` (STARTTLS), or `465` for SSL/TLS |
   | Username | Exact SMTP login shown in Brevo; it can differ from your account email |
   | Password | Brevo **SMTP key** |
   | Sender email | Gmail address verified as a sender in Brevo |
   | Sender name | `Bakaiti` |
   | Minimum interval per user | `60` seconds |

5. Save changes. Keep **Email signup** and **Confirm email** enabled, OTP length `6`, expiration `600` seconds, and the existing [Confirm sign up code template](templates/confirm-signup.html) using `{{ .Token }}`. No template needs to be created in Brevo: Supabase supplies the email body over SMTP.
6. Submit signup once with your own email. Check **Brevo → Transactional → Email logs**, Supabase Auth logs, and inbox/spam. Verify the code, then test username/password login. Both Supabase Auth limits and Brevo's daily quota apply.

**Gmail-only limitation:** you cannot authenticate `gmail.com` as your own domain. Brevo documents temporarily rewriting free-address senders to a compliant address such as `name@account.t-sender-sib.com`. That allows a starting setup without buying a domain, subject to account approval and delivery checks; use a domain you own and authenticate it for the public launch. Do not promise that recipients will see your Gmail address as the From address.

SMTP secrets must be entered privately in the Supabase dashboard. Adding them to `.env.local` does not configure Supabase Auth's email service. Brevo/Supabase dashboard credentials are not available to the app, so this provider switch remains a dashboard step until saved and tested.

References: [free-plan quota](https://help.brevo.com/hc/en-us/articles/208589409-About-Brevo-s-pricing-plans), [SMTP credentials](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP), [free sender rewriting](https://help.brevo.com/hc/en-us/articles/14925263522578-Comply-with-Gmail-Yahoo-and-Microsoft-s-requirements-for-email-senders), [Supabase SMTP integration](https://developers.brevo.com/docs/supabase-smtp-integration).

## Alternative: Gmail's own SMTP

1. Enable **2-Step Verification** on the Google account that will send email, then create a **Google app password** for Bakaiti. Availability depends on the account's security/organization policy. Keep it private; do not use your normal Google password.
2. In Supabase Dashboard, open **Authentication → Email → SMTP settings** (dashboard labels may vary) and enable custom SMTP:

   | Setting | Value |
   | --- | --- |
   | Host | `smtp.gmail.com` |
   | Port | `587` (STARTTLS), or `465` for SSL |
   | Username | Full Gmail address |
   | Password | Google app password |
   | Sender email | Same Gmail address |
   | Sender name | `Bakaiti` |

3. Under the **Email provider**, enable email signup and **Confirm email**. Keep confirmation enabled: it prevents the Auth API itself from issuing signup sessions before verification. The app also rejects immediate signup sessions if this setting is disabled.
4. Set **Email OTP length** to **6**, **Email OTP expiration** to **600 seconds** (recommended), and the send/resend interval to at least **60 seconds**. The UI uses a 60-second resend cooldown; Supabase enforces the actual limits. Configure Auth rate limits and CAPTCHA for public traffic according to your deployment's abuse risk.
5. Under **Email templates → Confirm sign up**, use subject `Your Bakaiti verification code` and paste [templates/confirm-signup.html](templates/confirm-signup.html). It uses `{{ .Token }}` rather than a confirmation-link variable. This is the **Confirm sign up** template; Magic Link is a separate flow.
6. Set Supabase **Site URL** to your deployed app origin and allow the exact `/auth/callback` URLs used for password recovery. Locally, use `http://localhost:3000` and `http://localhost:3000/auth/callback`.

SMTP settings belong in Supabase, not `.env.local`, source code, browser bundles or chat. Gmail sending limits apply; monitor delivery and move to a transactional provider when traffic requires it. Google can revoke app passwords after account password changes.

## Troubleshoot a generic signup failure

"Unable to create your account. Try another username, or sign in if you already registered." was the app's fallback for many different Auth API errors. That message alone does not prove that a username/email is already registered, including when a fresh account is used.

Signup now maps known provider codes to a clear email-restriction, disabled-signup, rejected-email, password-policy or CAPTCHA message. For other failures, inspect the terminal running `npm run dev`: `[auth:signup]` logs only a bounded provider code and HTTP status, excluding email, password, raw provider messages and tokens. Local development also appends an `Auth code: ...` reference to unmapped errors, so troubleshooting does not require terminal access. This reference is omitted in production. Share only those code/status values when reporting a problem. Login keeps its generic wrong-credentials response.

If the code is `unexpected_failure` or unknown, inspect the matching request in **Supabase → Authentication → Logs**. Database triggers and SMTP failures can both cause backend errors; use that log to distinguish them before changing schemas or providers. Check **Brevo → Transactional → Email logs** for delivery rejections. An `email_address_not_authorized` code means the default SMTP recipient restriction is still active; verify custom SMTP was saved in the project the app actually uses.

Reference: [Supabase Auth error codes](https://supabase.com/docs/guides/auth/debugging/error-codes).

## Troubleshoot sign-in being temporarily unavailable

Username/password login resolves the username privately through the server-only Supabase client. It requires a real credential in `.env.local` under `SUPABASE_SERVICE_ROLE_KEY`; a placeholder is not sufficient even when signup with the public key works.

On 2026-11-07, a read-only profile-query check first returned HTTP401 while this variable contained a placeholder. After the user saved a Secret key, the old URL/public key were still pointing at a different project, so requests continued to fail with `Invalid API key`. Aligning all three values with Bakaiti resolved that failure. No real credential was printed.

1. Open the same Supabase project's **Settings → API Keys**.
2. Copy a server-only **Secret key** (`sb_secret_...`), or the existing legacy **service_role** key. This app's installed SDK accepts the server credential through the existing `SUPABASE_SERVICE_ROLE_KEY` variable. Do not use the public publishable/anon key for this variable.
3. Replace the placeholder in `.env.local` privately. Keep the variable name unchanged and never add a `NEXT_PUBLIC_` prefix or paste its value into chat/source control.
4. Restart `npm run dev`, then retry login with the original username/password chosen for that email.

If signup reports `user_already_exists`, Supabase already has the submitted email, regardless of whether Bakaiti previously showed a signup error. An earlier immediate-session failure can have created an auto-confirmed Auth user before the app rejected its session. Repeated signup with a different username does not rename that user's profile. Restore the server credential before diagnosing login credentials or modifying profiles.

Reference: [Supabase server-only API keys](https://supabase.com/docs/guides/getting-started/api-keys).

## Troubleshoot "Email verification is not configured. Please contact support."

Bakaiti returns this exact message when Supabase's signup API returns an immediate signed-in session. The app signs out that session and stops the signup flow because signup email verification is required.

A read-only check on 2026-11-07 initially found `mailer_autoconfirm: true` because the app was connected to the old project. The signed-in Bakaiti dashboard had Confirm email enabled in a different project. After aligning the local connection with Bakaiti, its public settings correctly report `mailer_autoconfirm: false`. Saving SMTP credentials or a confirmation template alone does not enable confirmation.

1. Open the Supabase project matching `NEXT_PUBLIC_SUPABASE_URL` in `.env.local`.
2. Go to **Authentication → Sign In / Providers → Email** (sometimes labelled Providers).
3. Keep the Email provider enabled and turn **Confirm email ON**, then **Save**. If editing configuration through the Management API, the inverse setting is `mailer_autoconfirm: false`.
4. Test with a fresh email/username. Signup should now reach the six-digit code screen without creating an authenticated session before verification. Check Brevo's transactional logs and inbox/spam for delivery.

Accounts submitted while auto-confirmation was enabled may already exist and be marked confirmed. Enabling confirmation does not retroactively verify ownership or send a signup OTP for them. Check **Authentication → Users**; use the chosen username/password to try the existing account, and use a fresh test account for the OTP acceptance check. Do not repeatedly create the same account or delete existing users just to retry.

Reference: [Supabase Confirm Email configuration](https://supabase.com/docs/guides/auth/general-configuration).

## Troubleshoot "Request not allowed"

This response was generated by Bakaiti's auth endpoint before contacting Supabase. On 2026-11-03, `.env.local` used `http://localhost:3000` while the browser used `http://127.0.0.1:3000`. These are different origins.

The auth endpoint now accepts `localhost`, `127.0.0.1` and `[::1]` aliases **only in development**, only when the configured URL, request URL and Origin all use loopback hosts with the same protocol and port. Production still accepts only the exact configured app origin. Do not disable the origin check or allow arbitrary hosts to address this error.

Use [localhost:3000/signup](http://localhost:3000/signup) while developing. Production `NEXT_PUBLIC_APP_URL` must match the deployed public origin. Recovery callbacks still require the matching Supabase URL configuration.

An SMTP failure is a separate stage: check Supabase Auth logs for delivery errors, the provider logs for rejected messages, and sender/login/key configuration. Supabase's default test SMTP sends only to authorized organization/team addresses, so use a custom SMTP provider for other users.

## Application environment

Set the existing `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, server-only `SUPABASE_SERVICE_ROLE_KEY`, and `NEXT_PUBLIC_APP_URL`. The service-role key privately resolves username → auth user email for password authentication, since Supabase's password API accepts email/phone. The email is never returned by login or added to public profiles. Never prefix the service-role key with `NEXT_PUBLIC_`.

No new database migration is needed for this flow. Existing verified accounts retain their password and username. Username matching uses the registered spelling. Password reset continues to use email and remains a separate tracked recovery task.

## Verify before release

- Run `npm run test:auth`, `npm run test:security`, TypeScript checks and `npm run build`. Auth tests cover local-origin aliases, rejected hosts/ports and strict production origins. Mocked tests do not prove SMTP delivery.
- With a fresh email address you control, sign up with a unique username/password. Confirm no signed-in session exists before verification, and check inbox/spam for a six-digit code.
- Check incorrect, expired and reused codes, plus resend/cooldown. Failed verification must keep the form open; a valid code creates the cookie session and opens the feed.
- Sign out, then sign in with username/password. Wrong passwords and unknown usernames must return the same generic error. Confirm no login OTP is sent.
- Reload an unfinished signup and use the existing-signup verification option on login to re-enter the email and request a code. Passwords/codes are never stored in URLs or local storage.
- Check mobile/keyboard behavior, cookie persistence on reload, and protected-page access after logout against the actual Supabase project.

Production email delivery requires the dashboard configuration and live checks above; local tests do not imply those settings were applied.

## Reference

- [Google app passwords](https://support.google.com/mail/answer/185833?hl=en)
- [Gmail SMTP server and TLS ports](https://developers.google.com/workspace/gmail/imap/imap-smtp)
- [Supabase custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Supabase email templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Supabase email/password auth](https://supabase.com/docs/guides/auth/passwords)
- [Verify email codes](https://supabase.com/docs/reference/javascript/auth-verifyotp)
- [Resend signup confirmation](https://supabase.com/docs/reference/javascript/auth-resend)
