import type { ReactNode } from "react";

/** A short note in the letter's voice: the not-found and error pages. */
export function Note({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions: ReactNode;
}) {
  return (
    <article className="note">
      <h1>{title}</h1>
      {children}
      <p className="note-actions">{actions}</p>
    </article>
  );
}
