"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Note } from "./Note";

export interface ErrorProps {
  error: Error & { digest?: string };
  /** Fetches and renders the page again. */
  retry: () => void;
}

/** Body of a runtime error page. */
export function ErrorNote({ error, retry }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <Note
      title="This page did not load."
      actions={
        <>
          <button type="button" className="textbutton" onClick={retry}>
            Try again
          </button>
          <Link href="/">Front page</Link>
        </>
      }
    >
      <p>Something went wrong on the way. Trying again usually works.</p>
    </Note>
  );
}
