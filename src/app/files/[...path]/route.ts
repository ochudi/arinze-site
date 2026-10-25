import { files } from "@/lib/supabase";

/*
  The bucket's files at this site's own address. The body is streamed from
  storage under headers of our own, so nothing from the storage provider
  reaches the reader: not its name, not its cookies, and not its blanket
  x-robots-tag, which would keep the papers out of Google Scholar.
*/
const types: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};
const bucket = files.getPublicUrl("").data.publicUrl;

async function serve(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const type = types[path.at(-1)!.split(".").pop()!.toLowerCase()];
  // A "." or ".." part would climb out of the bucket once the URL is resolved.
  if (!type || path.some((part) => part === "." || part === ".."))
    return new Response("There is no file here.", { status: 404 });
  const upstream = await fetch(
    bucket + path.map(encodeURIComponent).join("/"),
    {
      method: request.method,
      // Uncompressed, so the length passed on is the length of the body.
      headers: { "Accept-Encoding": "identity" },
      cache: "no-store",
    },
  ).catch(() => null);
  // A storage outage is not a missing file: crawlers drop a 404, but retry a 502.
  if (!upstream?.ok)
    return upstream && upstream.status < 500
      ? new Response("There is no file here.", { status: 404 })
      : new Response("The file could not be loaded.", { status: 502 });
  const length = upstream.headers.get("content-length");
  return new Response(request.method === "HEAD" ? null : upstream.body, {
    headers: {
      "Content-Type": type,
      ...(length && { "Content-Length": length }),
      "Content-Disposition": "inline",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export { serve as GET, serve as HEAD };
