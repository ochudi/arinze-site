import "server-only";
import { evaluate } from "@mdx-js/mdx";
import { cache, type ComponentType } from "react";
import * as runtime from "react/jsx-runtime";
import remarkSmartypants from "remark-smartypants";
import { sections } from "./site";
import { db } from "./supabase";

/*
  The only door to the content. Pages are prerendered from these reads and
  rebuilt when the admin saves, so visitors never wait on the database.
  The shapes mirror the tables in supabase/schema.sql.
*/
export interface Person {
  name: string;
  url: string | null;
}
export interface LinkItem {
  label: string;
  url: string | null;
}
export interface Profile {
  name: string;
  role: string;
  institution: string;
  university: string;
  lede: string;
  bio: string;
  email: string;
  portrait: string | null;
  cv: string | null;
  affiliations: Person[];
  links: LinkItem[];
  /** When anything on the site was last changed in the editor. */
  updated_at: string;
}
export interface Paper {
  slug: string;
  title: string;
  section: (typeof sections)[number]["id"];
  year: string;
  coauthors: Person[];
  venue: string;
  citation: string;
  status: string;
  abstract: string;
  pdf: string | null;
  url: string | null;
  doi: string;
  links: LinkItem[];
  selected: boolean;
}
export interface MediaItem {
  slug: string;
  title: string;
  kind: "podcast" | "interview" | "article" | "talk";
  outlet: string;
  date: string | null;
  url: string;
  audio: string | null;
}
export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  summary: string;
  outlet: string;
  external: string | null;
}
export type Post = PostMeta & { Content: ComponentType };

async function rows<T>(table: string, columns = "*"): Promise<T[]> {
  const { data, error } = await db.from(table).select(columns);
  if (error) throw new Error(`${table}: ${error.message}`);
  return data as T[];
}

export const getProfile = cache(async (): Promise<Profile> => {
  const [profile] = await rows<Profile>("arinze_profile");
  if (!profile) throw new Error("arinze_profile is empty: run `npm run seed`");
  return profile;
});

/** Every paper, newest first; undated work last, by title. */
export const getPapers = cache(async (): Promise<Paper[]> =>
  (await rows<Paper>("arinze_papers")).sort(
    (a, b) => Number(b.year) - Number(a.year) || a.title.localeCompare(b.title),
  ),
);

/** The research page: sections in IA order, empty ones left out. */
export async function getResearch() {
  const papers = await getPapers();
  return sections
    .map((section) => ({
      ...section,
      papers: papers.filter((paper) => paper.section === section.id),
    }))
    .filter((section) => section.papers.length > 0);
}

export async function getSelectedPapers(): Promise<Paper[]> {
  return (await getPapers()).filter((paper) => paper.selected).slice(0, 3);
}

/** Podcasts, interviews and pieces elsewhere, newest first. */
export const getMedia = cache(async (): Promise<MediaItem[]> =>
  (await rows<MediaItem>("arinze_media")).sort((a, b) =>
    (b.date ?? "").localeCompare(a.date ?? ""),
  ),
);

/** Every published piece of writing, newest first, without its body. */
export const getPosts = cache(async (): Promise<PostMeta[]> => {
  const { data, error } = await db
    .from("arinze_writing")
    .select("slug, title, date, summary, outlet, external")
    .eq("draft", false)
    .order("date", { ascending: false });
  if (error) throw new Error(`arinze_writing: ${error.message}`);
  return data;
});

/** One published post with its Markdown body compiled. */
export const getPost = cache(async (slug: string): Promise<Post | null> => {
  const { data } = await db
    .from("arinze_writing")
    .select("slug, title, date, summary, outlet, external, body")
    .eq("slug", slug)
    .eq("draft", false)
    .maybeSingle();
  if (!data) return null;
  const { body, ...meta } = data;
  const { default: Content } = await evaluate(body, {
    ...runtime,
    format: "md",
    remarkPlugins: [remarkSmartypants],
  });
  return { ...meta, Content };
});
