"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { remove, save, uploadTarget } from "./actions";
import { ask, clearProblems, notify } from "./Notices";
import type { Field, FormState, Group, Row } from "./schema";

// The writing editor is only fetched on the pages that have one.
const Editor = dynamic(() => import("./Editor"), {
  ssr: false,
  loading: () => <div className="editor" aria-busy="true" />,
});

/*
  The one form. It draws whatever groups of fields it is given (schema.ts),
  keeps what was typed when the server sends a correction back, asks before
  unsaved work is left behind, and keeps Save within reach at the foot of
  the screen.
*/
export function Form({
  sheet,
  slug,
  groups,
  row,
  one,
  back,
}: {
  /** "profile" or a collection key. */
  sheet: string;
  /** The entry being edited; null for the profile and for a new entry. */
  slug: string | null;
  groups: Group[];
  row: Row;
  one: string;
  back: string;
}) {
  const [state, setState] = useState<FormState>({});
  const [dirty, setDirty] = useState(false);
  const [uploads, setUploads] = useState(0);
  const [pending, start] = useTransition();
  const leaving = useRef(false);
  const isNew = slug === null && sheet !== "profile";
  const touch = () => setDirty(true);

  // Unsaved work: ask before a link, Sign out, a reload or a closed tab takes it away.
  useEffect(() => {
    if (!dirty) return;
    const reload = (event: BeforeUnloadEvent) => event.preventDefault();
    const leave = (event: MouseEvent) => {
      const way = (event.target as Element).closest<HTMLElement>(
        "a[href]:not([target]), .desk-out button",
      );
      // A click that opens a new tab or window takes nothing away.
      const elsewhere = event.metaKey || event.ctrlKey || event.shiftKey;
      if (!way || leaving.current || elsewhere) return;
      event.preventDefault();
      event.stopPropagation();
      ask({
        title: "Leave without saving?",
        body: "Your changes on this page will be lost.",
        yes: "Leave",
        no: "Keep editing",
        danger: true,
      }).then((answer) => {
        if (answer === null) return;
        leaving.current = true;
        way.click();
      });
    };
    window.addEventListener("beforeunload", reload);
    document.addEventListener("click", leave, true);
    return () => {
      window.removeEventListener("beforeunload", reload);
      document.removeEventListener("click", leave, true);
    };
  }, [dirty]);

  useEffect(() => {
    document.querySelector<HTMLElement>("[aria-invalid]")?.focus();
  }, [state]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    clearProblems();
    start(async () => {
      const answer = await save(sheet, slug, form);
      // No answer means it saved and we are on our way back to the list.
      if (!answer) return setDirty(false);
      setState(answer);
      notify(
        answer.message ?? "Not saved. Please correct what is marked in red.",
        { error: true },
      );
    });
  }

  return (
    <>
      <form className="form" onSubmit={submit} onChange={touch}>
        {groups.map((group, i) => (
          <section className="group" key={group.heading ?? i}>
            {group.heading && <h2>{group.heading}</h2>}
            {group.note && <p className="hint">{group.note}</p>}
            {group.fields.map((field) => (
              <Control
                key={field.name}
                field={field}
                value={row[field.name]}
                error={state.errors?.[field.name]}
                // A lone field under a heading of the same name needs no second label.
                bare={field.label === group.heading}
                touch={touch}
                busy={(on) => setUploads((n) => n + (on ? 1 : -1))}
              />
            ))}
          </section>
        ))}
        <div className="savebar">
          <button className="button" disabled={pending || uploads > 0}>
            {uploads > 0
              ? "Waiting for the upload…"
              : pending
                ? "Saving…"
                : isNew
                  ? `Add this ${one}`
                  : "Save changes"}
          </button>
          <Link href={back} className="quiet">
            Cancel
          </Link>
        </div>
      </form>
      {slug && (
        <p className="remove">
          <button
            type="button"
            className="danger"
            disabled={pending}
            onClick={async () => {
              const sure = await ask({
                title: `Delete this ${one}?`,
                body: `“${row.title}” comes off the site at once. This cannot be undone.`,
                yes: "Delete",
                danger: true,
              });
              if (sure !== null) start(() => remove(sheet, slug));
            }}
          >
            Delete this {one}
          </button>
        </p>
      )}
    </>
  );
}

function Control({
  field,
  value,
  error,
  bare,
  touch,
  busy,
}: {
  field: Field;
  value: unknown;
  error?: string;
  bare: boolean;
  touch: () => void;
  busy: (on: boolean) => void;
}) {
  const id = `f-${field.name}`;
  // One line under the field: what went wrong, or else what the field is for.
  const note = (error || field.hint) && (
    <span className={error ? "error" : "hint"} id={`${id}-note`}>
      {error ?? field.hint}
    </span>
  );
  const common = {
    id,
    name: field.name,
    required: field.required,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": note ? `${id}-note` : undefined,
  };
  const text = (value as string | null) ?? "";

  if (field.type === "checkbox")
    return (
      <div className="field">
        <label className="check">
          <input type="checkbox" {...common} defaultChecked={value === true} />
          {field.label}
        </label>
        {note}
      </div>
    );
  if (field.type === "pairs")
    return (
      <Pairs field={field} initial={(value as Pair[]) ?? []} touch={touch}>
        {note}
      </Pairs>
    );
  if (field.type === "file")
    return (
      <FileField field={field} initial={text} touch={touch} busy={busy}>
        {note}
      </FileField>
    );
  return (
    <div className="field">
      <label htmlFor={id} className={bare ? "sr-only" : undefined}>
        {field.label}
      </label>
      {field.type === "markdown" ? (
        <Writing field={field} initial={text} touch={touch} />
      ) : field.type === "textarea" ? (
        <textarea {...common} rows={field.rows} defaultValue={text} />
      ) : field.type === "select" ? (
        <select {...common} defaultValue={text}>
          {!text && (
            <option value="" disabled>
              Choose…
            </option>
          )}
          {Object.entries(field.options).map(([option, label]) => (
            <option key={option} value={option}>
              {label}
            </option>
          ))}
        </select>
      ) : (
        <input
          {...common}
          defaultValue={text}
          className={field.type === "year" ? "short" : undefined}
          // Web addresses are tidied on the server, so "lbs.edu.ng" is accepted as typed.
          type={
            field.type === "date" || field.type === "email"
              ? field.type
              : "text"
          }
          inputMode={
            field.type === "url"
              ? "url"
              : field.type === "year"
                ? "numeric"
                : undefined
          }
          autoCapitalize={field.type === "url" ? "none" : undefined}
        />
      )}
      {note}
    </div>
  );
}

/**
 * An essay's text. The value lives here, not in the editor, so the form
 * always carries it: saving before the editor has loaded changes nothing.
 */
function Writing({
  field,
  initial,
  touch,
}: {
  field: Field;
  initial: string;
  touch: () => void;
}) {
  const [body, setBody] = useState(initial);
  return (
    <>
      <Editor
        label={field.label}
        initial={initial}
        onChange={(markdown) => {
          setBody(markdown);
          touch();
        }}
      />
      <input type="hidden" name={field.name} value={body} />
    </>
  );
}

type Pair = Record<string, string | null>;

/** A short list of two-part rows; it travels to the server as one JSON field. */
function Pairs({
  field,
  initial,
  touch,
  children,
}: {
  field: Extract<Field, { type: "pairs" }>;
  initial: Pair[];
  touch: () => void;
  children: React.ReactNode;
}) {
  const [rows, setRows] = useState(initial);
  const change = (next: Pair[]) => {
    setRows(next);
    touch();
  };
  return (
    <fieldset className="field">
      <legend className="sr-only">{field.label}</legend>
      {rows.map((row, i) => (
        <div className="pair" key={i}>
          {field.columns.map(([key, label]) => (
            <input
              key={key}
              aria-label={label}
              placeholder={label}
              value={row[key] ?? ""}
              inputMode={key === "url" ? "url" : undefined}
              autoCapitalize={key === "url" ? "none" : undefined}
              onChange={(event) =>
                change(
                  rows.map((other, j) =>
                    j === i ? { ...other, [key]: event.target.value } : other,
                  ),
                )
              }
            />
          ))}
          <button
            type="button"
            className="textbutton"
            onClick={() => change(rows.filter((_, j) => j !== i))}
          >
            Remove
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button plain"
        onClick={() => change([...rows, {}])}
      >
        Add {field.item}
      </button>
      <input type="hidden" name={field.name} value={JSON.stringify(rows)} />
      {children}
    </fieldset>
  );
}

/** Uploads straight from the browser to storage, then remembers the file's path. */
function FileField({
  field,
  initial,
  touch,
  busy,
  children,
}: {
  field: Extract<Field, { type: "file" }>;
  initial: string;
  touch: () => void;
  busy: (on: boolean) => void;
  children: React.ReactNode;
}) {
  const [path, setPath] = useState(initial);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const image = field.accept.startsWith("image/");
  const noun = image ? "picture" : "PDF";

  async function upload(file: File | undefined) {
    if (!file || sending) return;
    if (file.size > 20 * 1024 * 1024)
      return setNote("That file is larger than 20 MB.");
    setSending(true);
    busy(true);
    setNote("Uploading…");
    try {
      const target = await uploadTarget(field.folder, file.name);
      if ("error" in target) throw new Error(target.error);
      const body = new FormData();
      body.append("cacheControl", "3600");
      body.append("", file);
      const sent = await fetch(target.url, { method: "PUT", body });
      if (!sent.ok) throw new Error();
      setPath(target.path);
      setNote("Uploaded. Save to put it on the site.");
      touch();
    } catch (problem) {
      setNote(
        (problem as Error).message ||
          "The upload did not go through. Please try again.",
      );
    }
    setSending(false);
    busy(false);
  }

  return (
    <div className="field">
      <span className="label">{field.label}</span>
      <div
        className="file"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          upload(event.dataTransfer.files[0]);
        }}
      >
        {path && image && (
          <Image
            src={`/files/${path}`}
            alt=""
            width={56}
            height={70}
            unoptimized
          />
        )}
        {path && !image && (
          <a href={`/files/${path}`} target="_blank">
            {path.split("/").pop()}
          </a>
        )}
        {!path && <span className="hint">No {noun} yet.</span>}
        <label className="button plain">
          {path ? `Replace the ${noun}` : `Choose a ${noun}`}
          <input
            type="file"
            className="sr-only"
            accept={field.accept}
            disabled={sending}
            onChange={(event) => upload(event.target.files?.[0])}
          />
        </label>
        {path && (
          <button
            type="button"
            className="textbutton"
            onClick={() => {
              setPath("");
              setNote("Removed. Save to take it off the site.");
              touch();
            }}
          >
            Remove
          </button>
        )}
        {note && (
          <span className="hint status" role="status">
            {note}
          </span>
        )}
      </div>
      <input type="hidden" name={field.name} value={path} />
      {children}
    </div>
  );
}
