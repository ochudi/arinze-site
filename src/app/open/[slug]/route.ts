import { db } from "@/lib/supabase";

/*
  Counts one opening of a paper. Browsers call it through the title link's
  ping attribute; nothing about the visitor is read or stored, only the
  paper and the day (arinze_opens).
*/
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (request.headers.get("content-type") === "text/ping")
    await db.rpc("arinze_count_open", { paper_slug: (await params).slug });
  return new Response(null, { status: 204 });
}
