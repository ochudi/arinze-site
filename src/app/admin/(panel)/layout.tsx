import Link from "next/link";
import type { ReactNode } from "react";
import { NavLink } from "@/components/NavLink";
import { requireAdmin } from "@/lib/auth";
import { getProfile } from "@/lib/content";
import { signOut } from "../actions";
import { collections } from "../schema";

/** The editor's frame: the same letterhead as the site, with the editor's own menu. */
export default async function Panel({ children }: { children: ReactNode }) {
  await requireAdmin();
  const { name } = await getProfile();
  return (
    <div className="desk">
      <header className="desk-head">
        <Link href="/admin" className="wordmark quiet">
          {name}
        </Link>
        <div className="desk-out">
          <a href="/" target="_blank">
            View the site
          </a>
          <form action={signOut}>
            <button className="textbutton">Sign out</button>
          </form>
        </div>
        <nav aria-label="Editor" className="tabs">
          <NavLink href="/admin" exact>
            Overview
          </NavLink>
          <NavLink href="/admin/profile">Profile</NavLink>
          {Object.entries(collections).map(([key, { title }]) => (
            <NavLink key={key} href={`/admin/${key}`}>
              {title}
            </NavLink>
          ))}
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
