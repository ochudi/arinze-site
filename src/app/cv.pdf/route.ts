import { getProfile } from "@/lib/content";
import { fileRedirect } from "@/lib/site";

export const dynamic = "force-static";

/** The stable CV address: sends the reader to whichever file the profile names today. */
export async function GET() {
  return fileRedirect((await getProfile()).cv);
}
