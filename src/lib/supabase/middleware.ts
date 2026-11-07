import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isAuthPage, isPublicPage, isPublicAuthApi } from "@/lib/security/routes";

export async function updateSession(request: NextRequest) {
  // Cron checks its bearer secret; auth endpoints validate credentials/codes themselves.
  if (request.nextUrl.pathname === "/api/cron" || isPublicAuthApi(request.nextUrl.pathname)) return NextResponse.next();
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Do not run code between createServerClient and supabase.auth.getUser().
  // A simple mistake could make it very hard to debug issues with users being
  // randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protected routes - redirect to login if not authenticated
  const pathname = request.nextUrl.pathname;
  const isAuthRoute = isAuthPage(pathname);
  const isPublicRoute = isPublicPage(pathname);

  const redirectWithCookies = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const response = NextResponse.redirect(url);
    for (const cookie of supabaseResponse.cookies.getAll()) response.cookies.set(cookie);
    return response;
  };

  if (!user && !isPublicRoute) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return redirectWithCookies("/login");
  }

  // Redirect authenticated users away from auth pages
  if (user && isAuthRoute) {
    return redirectWithCookies("/feed");
  }

  // Redirect root to feed for authenticated users
  if (user && request.nextUrl.pathname === "/") {
    return redirectWithCookies("/feed");
  }

  return supabaseResponse;
}
