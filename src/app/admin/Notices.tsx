"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/*
  How the editor speaks: a short note that slides in at the foot of the
  screen (saved, deleted, something to fix) and, before anything that cannot
  be undone, a question in a small dialog. Any component calls notify() or
  ask(); the one <Notices /> in the layout shows them.
*/
interface Note {
  id: number;
  message: string;
  /** Something to follow up with, such as the page that just changed. */
  href?: string;
  /** A problem: stays until dismissed and is announced at once. */
  error?: boolean;
  leaving?: boolean;
}
interface Question {
  title: string;
  body?: string;
  /** The word on the button that goes ahead. */
  yes: string;
  no?: string;
  danger?: boolean;
  /** Ask for a line of text as well. */
  input?: { label: string; value: string };
}

type Asked = Question & { resolve: (answer: string | null) => void };

// The one <Notices /> on the page registers here; a note sent before it has
// mounted (on a fresh page load) waits for it.
let host: {
  note: (note: Note) => void;
  ask: (asked: Asked) => void;
  clear: () => void;
} | null = null;
const waiting: Note[] = [];
let count = 0;

export function notify(
  message: string,
  more: Omit<Note, "id" | "message"> = {},
) {
  const note = { ...more, message, id: ++count };
  if (host) host.note(note);
  else waiting.push(note);
}

/** A new attempt starts with a clean slate: yesterday's problem is not left standing over today's success. */
export function clearProblems() {
  host?.clear();
}

/** Resolves to null when declined, otherwise to the text typed ("" when none was asked for). */
export function ask(question: Question): Promise<string | null> {
  return new Promise((resolve) => host?.ask({ ...question, resolve }));
}

/** Says something once on arrival, for news carried over a redirect (?saved=…). */
export function Flash({
  message,
  href,
  keep,
}: {
  message: string;
  href?: string;
  /** Leave the address as it is (the query is the page's state, not just news). */
  keep?: boolean;
}) {
  useEffect(() => {
    notify(message, { href });
    if (!keep) window.history.replaceState(null, "", window.location.pathname);
  }, [message, href, keep]);
  return null;
}

/** One note. It leaves by itself after six seconds unless it is a problem or the pointer rests on it. */
function Toast({
  note,
  dismiss,
  remove,
}: {
  note: Note;
  dismiss: (id: number) => void;
  remove: (id: number) => void;
}) {
  const [held, setHeld] = useState(false);
  useEffect(() => {
    if (note.error || note.leaving || held) return;
    const timer = window.setTimeout(() => dismiss(note.id), 6000);
    return () => window.clearTimeout(timer);
  }, [note, held, dismiss]);
  // Gone once the fade has had time to finish.
  useEffect(() => {
    if (!note.leaving) return;
    const timer = window.setTimeout(() => remove(note.id), 220);
    return () => window.clearTimeout(timer);
  }, [note, remove]);
  return (
    <div
      className={`toast${note.error ? " problem" : ""}${note.leaving ? " leaving" : ""}`}
      role={note.error ? "alert" : undefined}
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={() => setHeld(false)}
    >
      <p>
        {note.message}
        {note.href && (
          <>
            {" "}
            <a href={note.href} target="_blank">
              See it
            </a>
          </>
        )}
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => dismiss(note.id)}
      >
        ×
      </button>
    </div>
  );
}

export function Notices() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [question, setQuestion] = useState<Asked | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  const dismiss = useCallback(
    (id: number) =>
      setNotes((all) =>
        all.map((note) => (note.id === id ? { ...note, leaving: true } : note)),
      ),
    [],
  );
  const remove = useCallback(
    (id: number) => setNotes((all) => all.filter((note) => note.id !== id)),
    [],
  );

  useEffect(() => {
    // The same news twice in a row is said once.
    const note = (note: Note) =>
      setNotes((all) =>
        all.some((other) => other.message === note.message && !other.leaving)
          ? all
          : [...all, note],
      );
    const clear = () => setNotes((all) => all.filter((note) => !note.error));
    host = { note, ask: setQuestion, clear };
    waiting.splice(0).forEach(note);
    return () => {
      host = null;
    };
  }, []);

  // Open on the safe answer: the text box if there is one, otherwise "Cancel".
  useEffect(() => {
    if (!question) return;
    dialog.current?.showModal();
    dialog.current
      ?.querySelector<HTMLElement>("input, button[value=no]")
      ?.focus();
  }, [question]);

  return (
    <>
      {/* Always present, so a screen reader announces whatever is added to it. */}
      <div className="toasts" aria-live="polite">
        {notes.map((note) => (
          <Toast key={note.id} note={note} dismiss={dismiss} remove={remove} />
        ))}
      </div>

      <dialog
        ref={dialog}
        className="ask"
        aria-labelledby="ask-title"
        aria-describedby={question?.body ? "ask-body" : undefined}
        // A press on the dimmed page behind the dialog is a "no". (The form fills the dialog, so only the backdrop is the dialog itself.)
        onPointerDown={(event) =>
          event.target === event.currentTarget && event.currentTarget.close()
        }
        onClose={(event) => {
          const box = event.currentTarget;
          const typed = box.querySelector<HTMLInputElement>("#answer")?.value;
          question?.resolve(box.returnValue === "yes" ? (typed ?? "") : null);
          box.returnValue = "";
          setQuestion(null);
        }}
      >
        {question && (
          <form method="dialog">
            <h2 id="ask-title">{question.title}</h2>
            {question.body && <p id="ask-body">{question.body}</p>}
            {question.input && (
              <div className="field">
                <label htmlFor="answer">{question.input.label}</label>
                <input
                  id="answer"
                  name="answer"
                  defaultValue={question.input.value}
                  autoCapitalize="none"
                />
              </div>
            )}
            <div className="ask-actions">
              <button
                className={question.danger ? "button alarm" : "button"}
                value="yes"
              >
                {question.yes}
              </button>
              <button className="button plain" value="no" formNoValidate>
                {question.no ?? "Cancel"}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
