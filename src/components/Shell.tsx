import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import type { Profile } from "@/lib/content";
import { formatDate, letterhead, navFor } from "@/lib/site";
import { NavLink } from "./NavLink";

/** The site frame: letterhead (name, title, school) with the navigation, main, footer. */
export function Shell({
  profile,
  hasWriting,
  children,
}: {
  profile: Profile;
  hasWriting: boolean;
  children: ReactNode;
}) {
  const line = letterhead(profile);
  return (
    <div className="page">
      <a href="#main" className="skip">
        Skip to content
      </a>
      <header className="head">
        <Link href="/" className="wordmark quiet">
          {profile.name}
        </Link>
        {line.length > 0 && (
          <p className="letterhead sans">
            {line.map((part, i) => (
              <Fragment key={part}>
                {i > 0 && ", "}
                <span>{part}</span>
              </Fragment>
            ))}
          </p>
        )}
        <nav aria-label="Primary" className="nav sans">
          <ul>
            {navFor(profile, hasWriting).map((item) => (
              <li key={item.href}>
                {item.external ? (
                  <a href={item.href} className="quiet">
                    {item.label}
                  </a>
                ) : (
                  <NavLink href={item.href} className="quiet">
                    {item.label}
                  </NavLink>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main id="main">{children}</main>
      <footer className="foot sans">
        <ul>
          {profile.email && (
            <li>
              <a href={`mailto:${profile.email}`}>{profile.email}</a>
            </li>
          )}
          {profile.links.map(
            (link) =>
              link.url && (
                <li key={link.url}>
                  <a href={link.url} rel="me">
                    {link.label}
                  </a>
                </li>
              ),
          )}
        </ul>
        <p>
          Updated{" "}
          <time dateTime={profile.updated_at}>
            {formatDate(profile.updated_at)}
          </time>
          <span className="sep" aria-hidden="true">
            {" · "}
          </span>
          © {profile.name}
        </p>
      </footer>
    </div>
  );
}
