import { NextResponse, type NextRequest } from "next/server";
import { sessionClient } from "@/lib/session";

/*
  Runs on /admin only: renews the editor's session cookie before it expires,
  which a Server Component cannot do for itself. The public pages never pass
  through here.
*/
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = sessionClient({
    getAll: () => request.cookies.getAll(),
    setAll: (all) => {
      for (const { name, value } of all) request.cookies.set(name, value);
      response = NextResponse.next({ request });
      for (const { name, value, options } of all)
        response.cookies.set(name, value, options);
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export const config = { matcher: "/admin/:path*" };
