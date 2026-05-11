import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Link from "@tiptap/extension-link";
import { useEffect } from "react";

interface EmailEditorProps {
  value: string;       // plain text / simple html stored
  onChange: (html: string) => void;
}

const BTN = (active: boolean) => ({
  padding: "4px 9px",
  background: active ? "#192943" : "#f4f6f9",
  color: active ? "#fff" : "#192943",
  border: "1px solid #dce4ed",
  borderRadius: 4,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'Open Sans',Arial,sans-serif",
  lineHeight: 1,
} as React.CSSProperties);

export function EmailEditor({ value, onChange }: EmailEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        style: [
          "min-height:280px",
          "padding:16px",
          "font-family:'Open Sans',Arial,sans-serif",
          "font-size:14px",
          "color:#192943",
          "line-height:1.7",
          "outline:none",
        ].join(";"),
      },
    },
  });

  // Sync external value changes (e.g. when switching cards)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false);
    }
  }, [value]);

  if (!editor) return null;

  const setLink = () => {
    const prev = editor.getAttributes("link").href ?? "";
    const url = window.prompt("Enter URL", prev);
    if (url === null) return;
    if (url === "") { editor.chain().focus().unsetLink().run(); return; }
    editor.chain().focus().setLink({ href: url }).run();
  };

  return (
    <div style={{ border: "1px solid #dce4ed", borderRadius: 6, overflow: "hidden" }}>
      {/* Toolbar */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: 4, padding: "8px 10px",
        background: "#f8fafc", borderBottom: "1px solid #dce4ed",
      }}>
        {/* Text style */}
        <button style={BTN(editor.isActive("bold"))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }} title="Bold">B</button>
        <button style={{ ...BTN(editor.isActive("italic")), fontStyle: "italic" }} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }} title="Italic">I</button>
        <button style={{ ...BTN(editor.isActive("underline")), textDecoration: "underline" }} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }} title="Underline">U</button>

        <div style={{ width: 1, background: "#dce4ed", margin: "0 4px" }} />

        {/* Headings */}
        <button style={BTN(editor.isActive("heading", { level: 2 }))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 2 }).run(); }} title="Heading">H2</button>
        <button style={BTN(editor.isActive("heading", { level: 3 }))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleHeading({ level: 3 }).run(); }} title="Sub-heading">H3</button>

        <div style={{ width: 1, background: "#dce4ed", margin: "0 4px" }} />

        {/* Lists */}
        <button style={BTN(editor.isActive("bulletList"))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleBulletList().run(); }} title="Bullet list">• List</button>
        <button style={BTN(editor.isActive("orderedList"))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().toggleOrderedList().run(); }} title="Numbered list">1. List</button>

        <div style={{ width: 1, background: "#dce4ed", margin: "0 4px" }} />

        {/* Alignment */}
        <button style={BTN(editor.isActive({ textAlign: "left" }))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign("left").run(); }} title="Align left">≡</button>
        <button style={BTN(editor.isActive({ textAlign: "center" }))} onMouseDown={e => { e.preventDefault(); editor.chain().focus().setTextAlign("center").run(); }} title="Center">≡</button>

        <div style={{ width: 1, background: "#dce4ed", margin: "0 4px" }} />

        {/* Link */}
        <button style={BTN(editor.isActive("link"))} onMouseDown={e => { e.preventDefault(); setLink(); }} title="Insert link">🔗 Link</button>

        <div style={{ width: 1, background: "#dce4ed", margin: "0 4px" }} />

        {/* Undo / Redo */}
        <button style={BTN(false)} onMouseDown={e => { e.preventDefault(); editor.chain().focus().undo().run(); }} title="Undo">↩</button>
        <button style={BTN(false)} onMouseDown={e => { e.preventDefault(); editor.chain().focus().redo().run(); }} title="Redo">↪</button>
      </div>

      {/* Placeholder hint */}
      <div style={{ padding: "4px 12px", background: "#fffbea", borderBottom: "1px solid #fde68a", fontSize: 11, color: "#92400e" }}>
        Use <strong>{"{{name}}"}</strong> and <strong>{"{{business}}"}</strong> anywhere in the text for personalisation
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />
    </div>
  );
}
