import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Paths that an unauthenticated visitor is allowed to reach. "/" is the
// public marketing landing page (the ad destination); "/blog" is the public,
// SEO-indexed blog; "/lp" holds the per-campaign ad landing pages.
const PUBLIC_PATHS = [
  "/",
  "/blog",
  "/lp",
  "/sign-in",
  "/sign-up",
  "/auth",
  "/privacy",
  "/terms",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: do not run code between createServerClient and getUser.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Logged-out visitor trying to reach a protected app page -> send to
  // sign-in, preserving where they were headed. (The public landing at "/"
  // is reached directly, with no redirect, so ad params stay intact.)
  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(url);
  }

  // Logged-in user on the landing or auth pages -> send into the app.
  if (
    user &&
    (pathname === "/" ||
      pathname === "/sign-in" ||
      pathname === "/sign-up")
  ) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  // IMPORTANT: return supabaseResponse to keep cookies in sync.
  return supabaseResponse;
}
