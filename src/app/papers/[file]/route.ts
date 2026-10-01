import { getPapers } from "@/lib/content";
import { fileRedirect } from "@/lib/site";

export const dynamic = "force-static";

export async function generateStaticParams() {
  return (await getPapers())
    .filter((paper) => paper.pdf)
    .map((paper) => ({ file: `${paper.slug}.pdf` }));
}

/*
  /papers/<slug>.pdf is a paper's lasting address: Google Scholar, syllabi
  and other people's links point here, and it sends the reader to whichever
  file is the paper's PDF today, so uploading a new version breaks nothing.
*/
export async function GET(
  _: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;
  const papers = await getPapers();
  return fileRedirect(papers.find((p) => `${p.slug}.pdf` === file)?.pdf);
}
