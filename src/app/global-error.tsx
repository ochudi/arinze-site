"use client";

import type { ErrorProps } from "@/components/ErrorNote";

/*
  Last resort: the root layout itself failed, so nothing of the site's own
  is imported. Plain HTML in the letter's palette with system fonts.
*/
export default function GlobalError({ retry }: ErrorProps) {
  return (
    <html lang="en-GB">
      <head>
        <title>Arinze Nwokolo</title>
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          background: "#fbf7f1",
          color: "#27231f",
          font: "400 1.125rem/1.7 Georgia, 'Times New Roman', serif",
        }}
      >
        <main
          style={{
            maxWidth: "36rem",
            margin: "0 auto",
            padding: "4rem 1.5rem",
          }}
        >
          <p style={{ margin: 0, fontStyle: "italic" }}>
            {/* A plain link: when the layout itself has failed, the way back is a full reload. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ color: "inherit", textDecoration: "none" }}>
              Arinze Nwokolo
            </a>
          </p>
          <h1
            style={{
              margin: "3rem 0 1.5rem",
              fontSize: "2rem",
              fontWeight: 400,
              lineHeight: 1.15,
            }}
          >
            The site did not load.
          </h1>
          <p style={{ margin: 0 }}>
            Something went wrong on the way. Trying again usually works.
          </p>
          <p style={{ margin: "2rem 0 0" }}>
            <button
              type="button"
              onClick={retry}
              style={{
                padding: 0,
                border: 0,
                background: "none",
                font: "inherit",
                color: "#5c6a3c",
                cursor: "pointer",
                textDecoration: "underline",
                textUnderlineOffset: "0.16em",
              }}
            >
              Try again
            </button>
          </p>
        </main>
      </body>
    </html>
  );
}
