"use client";

import { useCallback, useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import LinkExt from "@tiptap/extension-link";
import ImageExt from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Youtube from "@tiptap/extension-youtube";
import TextAlign from "@tiptap/extension-text-align";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TextStyle from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { Mark, mergeAttributes } from "@tiptap/core";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading2,
  Heading3,
  Heading4,
  List,
  ListOrdered,
  Quote,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link2,
  ImagePlus,
  Youtube as YoutubeIcon,
  Table as TableIcon,
  Minus,
  Undo2,
  Redo2,
  Baseline,
  Sparkles,
} from "lucide-react";
import { apiUploadImage, ApiError } from "@/lib/api-client";

// Resimlere "width" niteliği ekleyen genişletilmiş Image — editörde
// boyutlandırma için. width, HTML NİTELİĞİ olarak render edilir (backend
// sanitize 'width' niteliğine izin verir; style'a değil). Değer yüzde ("50%")
// veya px olabilir; article-body CSS'i height:auto ile oranı korur.
const ResizableImage = ImageExt.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (el) => el.getAttribute("width"),
        renderHTML: (attrs) => (attrs.width ? { width: attrs.width } : {}),
      },
    };
  },
});

// Glow (parlama) — seçili metni text-shadow ile parlatan özel mark. Parlama
// rengi currentColor: metnin rengiyle (Color eklentisi) birlikte parlar.
// Backend sanitize span[data-glow] + style'a izin verir (yoksa kayıtta silinir).
const Glow = Mark.create({
  name: "glow",
  parseHTML() {
    return [{ tag: "span[data-glow]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-glow": "true",
        style: "text-shadow: 0 0 6px currentColor, 0 0 14px currentColor;",
      }),
      0,
    ];
  },
});

/**
 * TipTap zengin metin editörü. HTML çıktısı editor.getHTML() ile onChange'e
 * verilir. Görseller /api/news/images'e yüklenir, dönen URL editöre eklenir.
 * Backend body'yi zaten sanitize eder; burada temel bir editör yeterlidir.
 */
export default function RichEditor({
  value,
  onChange,
  placeholder = "Haber içeriğini buraya yazın...",
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
}) {
  const editor = useEditor({
    // SSR uyumsuzluğunu önle (Next 15/16 App Router).
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      Underline,
      TextStyle,
      Color,
      Glow,
      LinkExt.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      ResizableImage.configure({ inline: false, allowBase64: false }),
      Placeholder.configure({ placeholder }),
      Youtube.configure({ controls: true, nocookie: true, width: 640, height: 360 }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || "",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  // Dış value değişirse (ör. kopyalama / veri yüklendiğinde) editörü senkronla.
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current && (value || "") !== "") {
      // TipTap v2 imzası: setContent(content, emitUpdate?, parseOptions?)
      editor.commands.setContent(value, false);
    }
    // sadece value değişince
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  if (!editor) {
    return (
      <div className="editor-shell">
        <div className="editor-content">
          <div className="muted">Editör yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-shell">
      <Toolbar editor={editor} />
      <div className="editor-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = useCallback(() => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Bağlantı adresi (URL):", prev ?? "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  }, [editor]);

  const addImage = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const res = await apiUploadImage(file);
        editor.chain().focus().setImage({ src: res.url }).run();
      } catch (err) {
        alert(err instanceof ApiError ? err.message : "Görsel yüklenemedi.");
      }
    };
    input.click();
  }, [editor]);

  const addYoutube = useCallback(() => {
    const url = window.prompt("YouTube video adresi:");
    if (!url) return;
    editor.commands.setYoutubeVideo({ src: url });
  }, [editor]);

  const insertTable = useCallback(() => {
    editor
      .chain()
      .focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run();
  }, [editor]);

  // Seçili görselin genişliğini ayarla (width niteliği). null = orijinal boyut.
  const setImageWidth = useCallback(
    (w: string | null) =>
      editor.chain().focus().updateAttributes("image", { width: w }).run(),
    [editor],
  );

  const B = ({
    onClick,
    active,
    title,
    children,
    disabled,
  }: {
    onClick: () => void;
    active?: boolean;
    title: string;
    children: React.ReactNode;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      className={`tb-btn ${active ? "active" : ""}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      title={title}
      disabled={disabled}
    >
      {children}
    </button>
  );

  return (
    <div className="editor-toolbar">
      <B
        onClick={() => editor.chain().focus().toggleBold().run()}
        active={editor.isActive("bold")}
        title="Kalın"
      >
        <Bold size={16} />
      </B>
      <B
        onClick={() => editor.chain().focus().toggleItalic().run()}
        active={editor.isActive("italic")}
        title="İtalik"
      >
        <Italic size={16} />
      </B>
      <B
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        active={editor.isActive("underline")}
        title="Altı çizili"
      >
        <UnderlineIcon size={16} />
      </B>
      <B
        onClick={() => editor.chain().focus().toggleStrike().run()}
        active={editor.isActive("strike")}
        title="Üstü çizili"
      >
        <Strikethrough size={16} />
      </B>

      <span className="tb-sep" />

      <B
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        active={editor.isActive("heading", { level: 2 })}
        title="Başlık 2"
      >
        <Heading2 size={16} />
      </B>
      <B
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        active={editor.isActive("heading", { level: 3 })}
        title="Başlık 3"
      >
        <Heading3 size={16} />
      </B>
      <B
        onClick={() => editor.chain().focus().toggleHeading({ level: 4 }).run()}
        active={editor.isActive("heading", { level: 4 })}
        title="Başlık 4"
      >
        <Heading4 size={16} />
      </B>

      <span className="tb-sep" />

      <B
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        active={editor.isActive("bulletList")}
        title="Madde işaretli liste"
      >
        <List size={16} />
      </B>
      <B
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        active={editor.isActive("orderedList")}
        title="Sıralı liste"
      >
        <ListOrdered size={16} />
      </B>
      <B
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        active={editor.isActive("blockquote")}
        title="Alıntı"
      >
        <Quote size={16} />
      </B>

      <span className="tb-sep" />

      <B
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        active={editor.isActive({ textAlign: "left" })}
        title="Sola hizala"
      >
        <AlignLeft size={16} />
      </B>
      <B
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        active={editor.isActive({ textAlign: "center" })}
        title="Ortala"
      >
        <AlignCenter size={16} />
      </B>
      <B
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        active={editor.isActive({ textAlign: "right" })}
        title="Sağa hizala"
      >
        <AlignRight size={16} />
      </B>

      <span className="tb-sep" />

      {/* Metin rengi — native renk seçici. .focus() seçimi geri yükler. */}
      <label
        className="tb-btn"
        title="Metin rengi"
        style={{ padding: 3, cursor: "pointer" }}
      >
        <input
          type="color"
          aria-label="Metin rengi"
          onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
          style={{
            width: 22,
            height: 22,
            padding: 0,
            border: "none",
            background: "transparent",
            cursor: "pointer",
          }}
        />
      </label>
      <B onClick={() => editor.chain().focus().unsetColor().run()} title="Rengi temizle">
        <Baseline size={16} />
      </B>
      <B
        onClick={() => editor.chain().focus().toggleMark("glow").run()}
        active={editor.isActive("glow")}
        title="Parlama (glow)"
      >
        <Sparkles size={16} />
      </B>

      <span className="tb-sep" />

      <B onClick={setLink} active={editor.isActive("link")} title="Bağlantı ekle/kaldır">
        <Link2 size={16} />
      </B>
      <B onClick={addImage} title="Görsel yükle">
        <ImagePlus size={16} />
      </B>
      <B onClick={addYoutube} title="YouTube ekle">
        <YoutubeIcon size={16} />
      </B>
      <B onClick={insertTable} title="Tablo ekle">
        <TableIcon size={16} />
      </B>
      <B onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Yatay çizgi">
        <Minus size={16} />
      </B>

      {/* Görsel seçiliyken boyut butonları çıkar (kendin boyutlandır). */}
      {editor.isActive("image") && (
        <>
          <span className="tb-sep" />
          <B onClick={() => setImageWidth("25%")} title="Görsel genişliği %25">
            25%
          </B>
          <B onClick={() => setImageWidth("50%")} title="Görsel genişliği %50">
            50%
          </B>
          <B onClick={() => setImageWidth("75%")} title="Görsel genişliği %75">
            75%
          </B>
          <B onClick={() => setImageWidth("100%")} title="Görsel tam genişlik">
            100%
          </B>
          <B onClick={() => setImageWidth(null)} title="Görseli orijinal boyuta döndür">
            Sıfırla
          </B>
        </>
      )}

      <span className="tb-sep" />

      <B
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Geri al"
      >
        <Undo2 size={16} />
      </B>
      <B
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="İleri al"
      >
        <Redo2 size={16} />
      </B>
    </div>
  );
}
