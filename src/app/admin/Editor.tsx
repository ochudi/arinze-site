"use client";

import Paragraph from "@tiptap/extension-paragraph";
import { Markdown } from "@tiptap/markdown";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ask } from "./Notices";

/*
  The writing desk: he writes as in a word processor, in the typeface the
  essay is read in, and it is stored as Markdown. Only what an essay on this
  site can show is offered: bold, italics, two levels of heading, quotation,
  lists and links.
*/

// A paragraph that happens to begin "2025. " or "- " must not come back as a list or a heading.
const PlainParagraph = Paragraph.extend({
  renderMarkdown: (node, helpers) =>
    helpers
      .renderChildren(node.content ?? [])
      .replace(/^(\d+)([.)]\s)|^([#+*-]\s)/, (_, digits, point, mark) =>
        digits ? `${digits}\\${point}` : `\\${mark}`,
      ),
});

/** "lbs.edu.ng" -> https://…, "a@b.org" -> mailto:…; a full address or a path on this site is kept. */
function address(text: string): string {
  if (/^([a-z][a-z0-9+.-]*:|\/)/i.test(text)) return text;
  return /^[^\s/]+@[^\s/]+$/.test(text) ? `mailto:${text}` : `https://${text}`;
}

export default function Editor({
  label,
  initial,
  onChange,
}: {
  label: string;
  initial: string;
  onChange: (markdown: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: false,
        heading: { levels: [2, 3] },
        link: { openOnClick: false, defaultProtocol: "https" },
        code: false,
        codeBlock: false,
        horizontalRule: false,
        strike: false,
        underline: false,
      }),
      PlainParagraph,
      Markdown,
    ],
    content: initial,
    contentType: "markdown",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose",
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label,
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getMarkdown()),
  });
  const on = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor?.isActive("bold"),
      italic: editor?.isActive("italic"),
      h2: editor?.isActive("heading", { level: 2 }),
      h3: editor?.isActive("heading", { level: 3 }),
      quote: editor?.isActive("blockquote"),
      bullets: editor?.isActive("bulletList"),
      numbers: editor?.isActive("orderedList"),
      link: editor?.isActive("link"),
    }),
  });
  if (!editor) return <div className="editor" aria-busy="true" />;

  const run = () => editor.chain().focus();
  async function link() {
    const typed = await ask({
      title: on?.link ? "Change the link" : "Add a link",
      body: on?.link
        ? "Empty the box to remove the link."
        : "For example lbs.edu.ng/healthcare",
      input: {
        label: "Web address",
        value: editor!.getAttributes("link").href ?? "",
      },
      yes: "Done",
    });
    if (typed === null) return;
    const href = typed.trim() && address(typed.trim());
    if (!href) run().extendMarkRange("link").unsetLink().run();
    else if (editor!.state.selection.empty && !on?.link)
      // Nothing selected: the address itself becomes the linked words.
      run()
        .insertContent({
          type: "text",
          text: typed.trim(),
          marks: [{ type: "link", attrs: { href } }],
        })
        .run();
    else run().extendMarkRange("link").setLink({ href }).run();
  }

  // Groups of tools; a thin rule is drawn between groups.
  const tools = [
    [
      ["bold", <b key="b">B</b>, () => run().toggleBold().run(), "Bold"],
      [
        "italic",
        <em key="i">I</em>,
        () => run().toggleItalic().run(),
        "Italic",
      ],
    ],
    [
      ["h2", "Heading", () => run().toggleHeading({ level: 2 }).run()],
      ["h3", "Subheading", () => run().toggleHeading({ level: 3 }).run()],
      ["quote", "Quote", () => run().toggleBlockquote().run()],
    ],
    [
      ["bullets", "Bullets", () => run().toggleBulletList().run()],
      ["numbers", "Numbers", () => run().toggleOrderedList().run()],
    ],
  ] as const;

  return (
    <div className="editor">
      <div className="tools" role="group" aria-label="Formatting">
        {tools.map((group, i) => (
          <span key={i}>
            {group.map(([key, face, act, name]) => (
              <button
                key={key}
                type="button"
                aria-label={name}
                aria-pressed={on?.[key] ?? false}
                // Keep the selection in the text when a tool is pressed.
                onMouseDown={(event) => event.preventDefault()}
                onClick={act}
              >
                {face}
              </button>
            ))}
          </span>
        ))}
        <span>
          <button
            type="button"
            aria-haspopup="dialog"
            className={on?.link ? "on" : undefined}
            onMouseDown={(event) => event.preventDefault()}
            onClick={link}
          >
            Link
          </button>
        </span>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
