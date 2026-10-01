import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const cardSize = { width: 1200, height: 630 };

const font = (file: string) => readFile(join(process.cwd(), "src/fonts", file));

/*
  The social card is the top of a letter: his name and letterhead line, the
  olive rule, then one sentence set large (his opening sentence, or an
  essay's title). Everything sits in the upper part of the frame, so it
  survives the crops of X and WhatsApp and still reads at thumbnail size.
*/
export async function card({
  name,
  line,
  body,
  foot,
}: {
  name: string;
  line: string;
  body: string;
  /** A quieter line or two under the sentence, such as an essay's summary. */
  foot?: string;
}) {
  const [roman, italic] = await Promise.all([
    font("Fraunces-Display-Regular.ttf"),
    font("Fraunces-Display-Italic.ttf"),
  ]);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "80px 96px",
        background: "#fbf7f1",
        color: "#27231f",
        fontFamily: "Fraunces",
      }}
    >
      <div style={{ fontSize: 46, fontStyle: "italic" }}>{name}</div>
      <div style={{ marginTop: 12, fontSize: 30, color: "#736b63" }}>
        {line}
      </div>
      <div style={{ marginTop: 26, height: 2, background: "#5c6a3c" }} />
      <div
        style={{
          marginTop: 60,
          display: "block",
          fontSize: 60,
          lineHeight: 1.28,
          letterSpacing: -0.3,
          lineClamp: foot ? 2 : 3,
        }}
      >
        {body}
      </div>
      {foot && (
        <div
          style={{
            marginTop: 28,
            display: "block",
            fontSize: 32,
            lineHeight: 1.35,
            color: "#736b63",
            lineClamp: 2,
          }}
        >
          {foot}
        </div>
      )}
    </div>,
    {
      ...cardSize,
      fonts: [
        { name: "Fraunces", data: roman, style: "normal", weight: 400 },
        { name: "Fraunces", data: italic, style: "italic", weight: 400 },
      ],
    },
  );
}
