import type { ReactNode } from "react";

/** Abstract accordion: a native disclosure, no JavaScript. Styled in globals.css. */
export function Abstract({ children }: { children: ReactNode }) {
  return (
    <details className="abstract">
      <summary>Abstract</summary>
      <div>{children}</div>
    </details>
  );
}
