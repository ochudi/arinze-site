import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const cardSize = { width: 1200, height: 630 };

const font = (file: string) => readFile(join(process.cwd(), "src/fonts", file));

const paper = "#fbf7f1";
const ink = "#27231f";
const muted = "#736b63";
const olive = "#5c6a3c";

/*
  The social card. For the site it is a visiting card and nothing more: his
  name, a short olive rule, his title and school, centred so that a square
  crop (a chat thumbnail) keeps all of it. No sentence about him: the
  client finds that vain. For an essay it is the letterhead with the
  essay's title and summary beneath, which is content, not a claim.
*/
export async function card({
  name,
  line,
  title,
  summary,
}: {
  name: string;
  /** His title, school and university. */
  line: string[];
  /** An essay's title; without it the card is the visiting card. */
  title?: string;
  summary?: string;
}) {
  const [roman, italic] = await Promise.all([
    font("Fraunces-Display-Regular.ttf"),
    font("Fraunces-Display-Italic.ttf"),
  ]);
  const sheet = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    background: paper,
    color: ink,
    fontFamily: "Fraunces",
  } as const;
  return new ImageResponse(
    title ? (
      <div style={{ ...sheet, padding: "80px 96px" }}>
        <div style={{ fontSize: 46, fontStyle: "italic" }}>{name}</div>
        <div style={{ marginTop: 12, fontSize: 30, color: muted }}>
          {line.join(", ")}
        </div>
        <div style={{ marginTop: 26, height: 2, background: olive }} />
        <div
          style={{
            marginTop: 60,
            display: "block",
            fontSize: 60,
            lineHeight: 1.28,
            letterSpacing: -0.3,
            lineClamp: 2,
          }}
        >
          {title}
        </div>
        {summary && (
          <div
            style={{
              marginTop: 28,
              display: "block",
              fontSize: 32,
              lineHeight: 1.35,
              color: muted,
              lineClamp: 2,
            }}
          >
            {summary}
          </div>
        )}
      </div>
    ) : (
      <div style={{ ...sheet, alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 88, fontStyle: "italic", letterSpacing: -1 }}>
          {name}
        </div>
        <div
          style={{ marginTop: 36, width: 88, height: 2, background: olive }}
        />
        {/* Each part is one piece, so a line only ever breaks between them. */}
        <div
          style={{
            marginTop: 34,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            columnGap: 9,
            maxWidth: 640,
            fontSize: 32,
            lineHeight: 1.4,
            color: muted,
          }}
        >
          {line.map((part, i) => (
            <div key={part}>{i < line.length - 1 ? `${part},` : part}</div>
          ))}
        </div>
      </div>
    ),
    {
      ...cardSize,
      fonts: [
        { name: "Fraunces", data: roman, style: "normal", weight: 400 },
        { name: "Fraunces", data: italic, style: "italic", weight: 400 },
      ],
    },
  );
}
