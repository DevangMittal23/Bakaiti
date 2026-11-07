const AUTH_PAGES = new Set(["/login", "/signup", "/forgot-password"]);
const AUTH_API_ROUTES = new Set([
  "/api/auth/signup", "/api/auth/login", "/api/auth/verify-signup", "/api/auth/resend-signup",
]);

export function isPublicAuthApi(path: string) {
  return AUTH_API_ROUTES.has(path);
}

export function isAuthPage(path: string) {
  return AUTH_PAGES.has(path);
}

export function isPublicPage(path: string) {
  return path === "/" || path === "/auth/callback" || isAuthPage(path);
}

export function appOrigin(requestUrl: string) {
  // Next.js may expose an internal localhost origin behind a reverse proxy.
  // Use the configured public app origin rather than trusting forwarded host headers.
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (!configured && process.env.NODE_ENV === "production") throw new Error("App URL is not configured");
  const url = new URL(configured || requestUrl);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("Invalid app URL");
  return url.origin;
}

export function isAllowedAuthOrigin(origin: string, requestUrl: string) {
  const configured = appOrigin(requestUrl);
  if (origin === configured) return true;
  if (process.env.NODE_ENV !== "development") return false;
  try {
    const expected = new URL(configured);
    const incoming = new URL(origin);
    const request = new URL(requestUrl);
    const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);
    // Local browser aliases may differ from .env.local; never widen production trust.
    return incoming.origin === origin && [expected, incoming, request].every((url) =>
      loopback.has(url.hostname) && url.protocol === expected.protocol && url.port === expected.port,
    );
  } catch {
    return false;
  }
}

export function safeRedirectPath(value: string | null, fallback = "/feed") {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith("//") || /[\\\u0000-\u001f\u007f]/.test(decoded)) return fallback;
    const url = new URL(value, "https://bakaiti.invalid");
    return url.origin === "https://bakaiti.invalid" ? `${url.pathname}${url.search}${url.hash}` : fallback;
  } catch {
    return fallback;
  }
}
