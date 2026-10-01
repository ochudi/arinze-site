import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";

/** A Supabase client for whoever is signed in; the session lives in the given cookies. */
export function sessionClient(cookies: CookieMethodsServer) {
  return createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      cookieOptions: {
        name: "admin-session",
        path: "/admin",
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      },
      cookies,
    },
  );
}
