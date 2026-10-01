"use client";

import { ErrorNote, type ErrorProps } from "@/components/ErrorNote";

/** Errors inside a page render within the site's frame. */
export default function Error(props: ErrorProps) {
  return <ErrorNote {...props} />;
}
