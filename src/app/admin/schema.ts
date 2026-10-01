import { formatDate, sections } from "@/lib/site";

/*
  What the editor can change, described as data. The admin pages, the forms
  and the save action are all generic over this file: to add a field, add a
  column in supabase/schema.sql and one entry here.
*/
interface Base {
  name: string;
  label: string;
  hint?: string;
  required?: boolean;
}
export type Field = Base &
  (
    | {
        type: "text" | "url" | "email" | "date" | "year" | "doi" | "checkbox";
      }
    | { type: "textarea"; rows: number }
    /** Formatted text, written in the editor and stored as Markdown. */
    | { type: "markdown" }
    | { type: "select"; options: Record<string, string> }
    | { type: "file"; folder: string; accept: string }
    /** A short list of two-part rows, such as a name and a web address. */
    | { type: "pairs"; item: string; columns: [Column, Column] }
  );

type Column = [key: string, label: string];

export interface Group {
  heading?: string;
  note?: string;
  fields: Field[];
}

export type Row = Record<string, unknown>;

/** What a form action answers when it has something to say. */
export interface FormState {
  errors?: Record<string, string>;
  message?: string;
  email?: string;
  done?: boolean;
}

export interface Collection {
  table: string;
  /** "Papers" in the menu, "paper" in a sentence. */
  title: string;
  one: string;
  intro: string;
  groups: Group[];
  /** The line under the title in a list. */
  detail: (row: Row) => string;
  /** Where an entry appears on the site. */
  href: (row: Row) => string;
  /** Split the list under these headings, by this column. */
  split?: { by: string; headings: Record<string, string> };
}

const join = (...parts: unknown[]) => parts.filter(Boolean).join(" · ");
const day = (date: unknown) => (date ? formatDate(date as string) : "");
const names = (people: unknown) =>
  (people as { name: string }[]).map((person) => person.name).join(", ");

const kind = {
  podcast: "Podcast",
  interview: "Interview",
  article: "Article",
  talk: "Talk",
};
type Kind = keyof typeof kind;

const section: Record<string, string> = Object.fromEntries(
  sections.map(({ id, heading }) => [id, heading]),
);

export const collections: Record<string, Collection> = {
  papers: {
    table: "arinze_papers",
    title: "Papers",
    one: "paper",
    intro:
      "Everything on the Research page. Papers are listed newest first within each section.",
    detail: (row) =>
      join(
        row.year,
        row.venue || row.status,
        names(row.coauthors) && `with ${names(row.coauthors)}`,
        row.selected && "on the front page",
      ),
    href: (row) => `/research#${row.slug}`,
    split: { by: "section", headings: section },
    groups: [
      {
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
          {
            name: "section",
            label: "Section",
            type: "select",
            options: section,
            required: true,
          },
          {
            name: "year",
            label: "Year",
            type: "year",
            hint: "Four digits. Leave empty for work in progress.",
          },
          {
            name: "selected",
            label: "Show on the front page",
            type: "checkbox",
            hint: "The front page shows the three newest papers ticked here.",
          },
        ],
      },
      {
        heading: "Co-authors",
        fields: [
          {
            name: "coauthors",
            label: "Co-authors",
            type: "pairs",
            item: "a co-author",
            columns: [
              ["name", "Name"],
              ["url", "Their web page (optional)"],
            ],
          },
        ],
      },
      {
        heading: "Where it appeared",
        fields: [
          {
            name: "venue",
            label: "Journal or series",
            type: "text",
            hint: "For example: American Journal of Political Science.",
          },
          {
            name: "citation",
            label: "Volume, issue, pages",
            type: "text",
            hint: "For example: 68(3), 942–957.",
          },
          {
            name: "status",
            label: "Status",
            type: "text",
            hint: "Only while there is no journal yet. For example: Under review.",
          },
        ],
      },
      {
        heading: "The paper itself",
        note: "The title links to the PDF if there is one, otherwise to the link, otherwise to the DOI.",
        fields: [
          {
            name: "pdf",
            label: "PDF",
            type: "file",
            folder: "papers",
            accept: "application/pdf",
            hint: "Upload it only if you may share it.",
          },
          {
            name: "url",
            label: "Link to the paper",
            type: "url",
            hint: "The journal or working-paper page.",
          },
          {
            name: "doi",
            label: "DOI",
            type: "doi",
            hint: "For example: 10.1111/ajps.12769",
          },
        ],
      },
      {
        heading: "Abstract",
        fields: [
          {
            name: "abstract",
            label: "Abstract",
            type: "textarea",
            rows: 9,
            hint: "Readers open it with a click under the paper.",
          },
        ],
      },
      {
        heading: "More links",
        note: "Replication data, an appendix, slides, a prize.",
        fields: [
          {
            name: "links",
            label: "More links",
            type: "pairs",
            item: "a link",
            columns: [
              ["label", "What it is"],
              ["url", "Web address"],
            ],
          },
        ],
      },
    ],
  },

  media: {
    table: "arinze_media",
    title: "Media",
    one: "mention",
    intro:
      "Podcasts, interviews and articles about your work. They appear under “In the media” at the foot of the Research page, newest first.",
    detail: (row) => join(row.outlet, kind[row.kind as Kind], day(row.date)),
    href: () => "/research#media",
    groups: [
      {
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
          {
            name: "kind",
            label: "Kind",
            type: "select",
            options: kind,
            required: true,
          },
          {
            name: "outlet",
            label: "Outlet",
            type: "text",
            hint: "For example: VoxDev.",
          },
          { name: "date", label: "Date", type: "date" },
          { name: "url", label: "Link", type: "url", required: true },
          {
            name: "audio",
            label: "MP3 address",
            type: "url",
            hint: "Podcasts only. With it, visitors can listen without leaving the page.",
          },
        ],
      },
    ],
  },

  writing: {
    table: "arinze_writing",
    title: "Writing",
    one: "piece",
    intro:
      "Essays and op-eds. The Writing page joins the menu once there is a first piece.",
    detail: (row) =>
      join(
        row.draft && "Draft, not on the site",
        day(row.date),
        row.outlet,
        row.external && "links out",
      ),
    href: (row) => (row.external as string) || `/writing/${row.slug}`,
    groups: [
      {
        fields: [
          { name: "title", label: "Title", type: "text", required: true },
          { name: "date", label: "Date", type: "date", required: true },
          {
            name: "summary",
            label: "Summary",
            type: "textarea",
            rows: 2,
            required: true,
            hint: "One or two sentences. Shown under the title, in search results and when the piece is shared.",
          },
          {
            name: "draft",
            label: "Keep as a draft",
            type: "checkbox",
            hint: "A draft is saved here but not shown on the site. Untick it when the piece is ready.",
          },
        ],
      },
      {
        heading: "Published elsewhere?",
        note: "If the piece lives on another site, give its address and the title will link there. Otherwise leave both empty and write the text below.",
        fields: [
          {
            name: "outlet",
            label: "Outlet",
            type: "text",
            hint: "For example: BusinessDay.",
          },
          { name: "external", label: "Link to the piece", type: "url" },
        ],
      },
      {
        heading: "Text",
        fields: [
          {
            name: "body",
            label: "Text",
            type: "markdown",
            hint: "Write as you would in a document. Select some words, then press a button above to format them.",
          },
        ],
      },
    ],
  },
};

export function collection(key: string): Collection | undefined {
  return Object.hasOwn(collections, key) ? collections[key] : undefined;
}

/** The one-row profile: the letterhead, the front page and the footer. */
export const profile: Collection = {
  table: "arinze_profile",
  title: "Profile",
  one: "profile",
  intro:
    "Your name, title and school head every page; the rest is the front page and the footer.",
  detail: () => "",
  href: () => "/",
  groups: [
    {
      heading: "Letterhead",
      fields: [
        { name: "name", label: "Name", type: "text", required: true },
        {
          name: "role",
          label: "Title",
          type: "text",
          hint: "For example: Senior Lecturer.",
        },
        { name: "institution", label: "School", type: "text" },
        { name: "university", label: "University", type: "text" },
      ],
    },
    {
      heading: "Front page",
      fields: [
        {
          name: "lede",
          label: "Opening sentence",
          type: "textarea",
          rows: 3,
          hint: "One sentence in your own voice. It is set large at the top.",
        },
        { name: "bio", label: "About you", type: "textarea", rows: 8 },
        {
          name: "portrait",
          label: "Portrait",
          type: "file",
          folder: "portrait",
          accept: "image/jpeg,image/png,image/webp",
          hint: "Shown small and in black and white, whatever you upload.",
        },
      ],
    },
    {
      heading: "Contact",
      fields: [
        { name: "email", label: "Email", type: "email" },
        {
          name: "cv",
          label: "CV",
          type: "file",
          folder: "cv",
          accept: "application/pdf",
          hint: "The CV link in the menu always opens the file uploaded here.",
        },
      ],
    },
    {
      heading: "Affiliations",
      note: "Shown in a quiet line under your bio.",
      fields: [
        {
          name: "affiliations",
          label: "Affiliations",
          type: "pairs",
          item: "an affiliation",
          columns: [
            ["name", "Name"],
            ["url", "Web page (optional)"],
          ],
        },
      ],
    },
    {
      heading: "Profiles elsewhere",
      note: "Shown in the footer of every page.",
      fields: [
        {
          name: "links",
          label: "Profiles elsewhere",
          type: "pairs",
          item: "a profile",
          columns: [
            ["label", "Name, e.g. LinkedIn"],
            ["url", "Web address"],
          ],
        },
      ],
    },
  ],
};
