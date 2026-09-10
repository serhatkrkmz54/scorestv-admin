"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import { TextSelection } from "@tiptap/pm/state";
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
  X as XIcon,
} from "lucide-react";
import { apiUploadImageIlerlemeli, ApiError } from "@/lib/api-client";
import { kucult, baytMetni } from "@/lib/gorsel";
import { videoCoz } from "@/lib/video-gomme";

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

/** Bir seferde en fazla kaç görsel — yanlışlıkla klasör sürüklemeye karşı. */
const TAVAN = 20;

/**
 * Eş zamanlı yükleme sayısı. Tarayıcı aynı sunucuya ~6 bağlantı açıyor;
 * 3 seçildi ki sayfanın kendi istekleri (kaydetme, medya listesi) sıraya
 * girmesin. Daha fazlası zaten hızlandırmaz — aynı yükleme hızı bölünüyor.
 */
const KANAL = 3;

/** Yükleme kuyruğundaki tek satır. */
interface YuklemeSatiri {
  id: number;
  ad: string;
  yuzde: number;
  durum: "kucultuluyor" | "yukleniyor" | "bitti" | "hata";
  /** Küçültme kazancı ("1,4 MB → 210 KB") ya da hata metni. */
  not?: string;
}

/**
 * Eş zamanlılığı sınırlayan kanal. İşler HEMEN başlatılıyor ama en fazla
 * {@code n} tanesi aynı anda koşuyor.
 */
function kanalAc(n: number) {
  let aktif = 0;
  const kuyruk: (() => void)[] = [];
  return async function <T>(is: () => Promise<T>): Promise<T> {
    if (aktif >= n) await new Promise<void>((devam) => kuyruk.push(devam));
    aktif++;
    try {
      return await is();
    } finally {
      aktif--;
      kuyruk.shift()?.();
    }
  };
}

/** Dosya listesinden yalnız görselleri alır. */
function gorselleriAyikla(dosyalar: FileList | null | undefined): File[] {
  if (!dosyalar) return [];
  return Array.from(dosyalar).filter((d) => d.type.startsWith("image/"));
}

/**
 * TipTap zengin metin editörü. HTML çıktısı editor.getHTML() ile onChange'e
 * verilir. Görseller /api/news/images'e yüklenir, dönen URL editöre eklenir.
 * Backend body'yi zaten sanitize eder; burada temel bir editör yeterlidir.
 *
 * <p>Görsel yolu üç şeyi birden yapıyor ve üçü de bir şikâyetin cevabı:
 * <ul>
 *   <li><b>ÇOKLU seçim</b> — dosya girdisi tek dosya alıyordu
 *       ({@code files[0]}), yani "birden fazla fotoğraf yükleyemiyorum"
 *       gerçek bir hataydı.</li>
 *   <li><b>Yüklemeden önce küçültme</b> ({@code lib/gorsel}) — kapak yolunda
 *       vardı, gövde yolunda YOKTU; telefondan gelen 5 MB'lık dosya ham
 *       gidiyordu.</li>
 *   <li><b>İlerleme</b> — hiçbir geri bildirim olmadığı için editör donmuş
 *       görünüyordu.</li>
 * </ul>
 *
 * <p>Sıra korunuyor: yüklemeler PARALEL, ekleme SIRALI. Tamamlanma sırasına
 * göre eklenseydi hızlı yüklenen küçük dosya yazının başına geçerdi.
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
  const [kuyruk, setKuyruk] = useState<YuklemeSatiri[]>([]);
  const [uyari, setUyari] = useState<string | null>(null);
  const sayacRef = useRef(0);
  // Editör kurulurken editorProps'un içinden çağrılacak işlevler; editör henüz
  // yoktan var olduğu için ref üzerinden bağlanıyorlar.
  const gorselYukleRef = useRef<(dosyalar: File[]) => void>(() => {});
  const videoYapistirRef = useRef<(metin: string) => boolean>(() => false);

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
    editorProps: {
      handlePaste(_view, event) {
        const pano = (event as ClipboardEvent).clipboardData;
        if (!pano) return false;

        // Görsel dosyası YALNIZ pano düz dosya taşıyorsa alınıyor. Bir web
        // sayfasından metin kopyalandığında pano hem text/html hem görsel
        // taşıyabiliyor; koşulsuz dosyayı alsaydık yapıştırılan PARAGRAF
        // kaybolur, yerine tek bir fotoğraf düşerdi.
        const html = pano.getData("text/html");
        const dosyalar = gorselleriAyikla(pano.files);
        if (dosyalar.length > 0 && !html) {
          event.preventDefault();
          gorselYukleRef.current(dosyalar);
          return true;
        }

        // Video adresi / gömme bloğu → çerçeveyi editör kuruyor.
        const metin = pano.getData("text/plain");
        if (metin && videoYapistirRef.current(metin)) {
          event.preventDefault();
          return true;
        }
        return false;
      },
      handleDrop(view, event) {
        const tasima = (event as DragEvent).dataTransfer;
        const dosyalar = gorselleriAyikla(tasima?.files);
        if (dosyalar.length === 0) return false;
        event.preventDefault();
        // İmleci BIRAKILAN noktaya taşı — yoksa görseller o an imlecin
        // bulunduğu yere (genelde yazının başına) düşer.
        const nokta = view.posAtCoords({
          left: (event as DragEvent).clientX,
          top: (event as DragEvent).clientY,
        });
        if (nokta) {
          view.dispatch(
            view.state.tr.setSelection(TextSelection.create(view.state.doc, nokta.pos)),
          );
        }
        gorselYukleRef.current(dosyalar);
        return true;
      },
    },
  });

  /** Kuyruk satırını günceller (yoksa hiçbir şey yapmaz). */
  const satirGuncelle = useCallback((id: number, yama: Partial<YuklemeSatiri>) => {
    setKuyruk((eski) => eski.map((s) => (s.id === id ? { ...s, ...yama } : s)));
  }, []);

  /**
   * Görselleri küçültüp yükler ve SIRAYLA editöre ekler.
   *
   * <p>Hata tek dosyayı düşürür, turu düşürmez: beşinci fotoğraf reddedilse
   * bile ilk dördü yazının içinde kalıyor.
   */
  const gorselleriYukle = useCallback(
    async (secilen: File[]) => {
      if (!editor || secilen.length === 0) return;
      setUyari(null);
      let dosyalar = secilen;
      if (dosyalar.length > TAVAN) {
        dosyalar = dosyalar.slice(0, TAVAN);
        setUyari(
          `Bir seferde en fazla ${TAVAN} görsel eklenebilir; ilk ${TAVAN} tanesi alındı.`,
        );
      }

      const satirlar = dosyalar.map((d) => ({
        id: ++sayacRef.current,
        ad: d.name || "görsel",
        yuzde: 0,
        durum: "kucultuluyor" as const,
      }));
      setKuyruk((eski) => [...eski, ...satirlar]);

      const kanal = kanalAc(KANAL);
      const isler = dosyalar.map((dosya, i) =>
        kanal(async (): Promise<string | null> => {
          const satir = satirlar[i];
          try {
            const k = await kucult(dosya);
            satirGuncelle(satir.id, {
              durum: "yukleniyor",
              not: k.kucultuldu
                ? `${baytMetni(k.oncekiBayt)} → ${baytMetni(k.sonrakiBayt)}`
                : undefined,
            });
            const sonuc = await apiUploadImageIlerlemeli(k.dosya, (y) =>
              satirGuncelle(satir.id, { yuzde: y }),
            );
            satirGuncelle(satir.id, { durum: "bitti", yuzde: 100 });
            return sonuc.url;
          } catch (err) {
            satirGuncelle(satir.id, {
              durum: "hata",
              not: err instanceof ApiError ? err.message : "Yüklenemedi.",
            });
            return null;
          }
        }),
      );

      // Ekleme SIRALI: paralel biten işleri seçim sırasına göre bekliyoruz.
      for (const is of isler) {
        const adres = await is;
        if (adres) editor.chain().focus().setImage({ src: adres }).run();
      }

      // Biten satırlar kendiliğinden kalksın; HATALI satırlar kalsın —
      // sessizce kaybolan bir hata, hata olmamasından kötü.
      const bitenler = satirlar.map((s) => s.id);
      window.setTimeout(() => {
        setKuyruk((eski) =>
          eski.filter((s) => !(bitenler.includes(s.id) && s.durum === "bitti")),
        );
      }, 1500);
    },
    [editor, satirGuncelle],
  );

  /**
   * Yapıştırılan metin bir video adresiyse gömer. {@code true} dönerse
   * yapıştırma tamamen bizde demektir.
   *
   * <p>Neden kendi elimizle: TipTap'in YouTube eklentisinin kendi yapıştırma
   * kuralı VAR, ama {@code Link} eklentisinin {@code autolink}'iyle aynı olayda
   * yarışıyor — hangisinin kazandığı garanti değil. Burada sıra bizde ve
   * sonuç her seferinde aynı.
   */
  const videoYapistir = useCallback(
    (metin: string, kaynak: "yapistirma" | "dugme" = "yapistirma"): boolean => {
      if (!editor) return false;
      const cozum = videoCoz(metin);
      if (cozum.tur === "youtube") {
        setUyari(null);
        editor.commands.setYoutubeVideo({ src: cozum.adres });
        return true;
      }
      if (cozum.tur === "yok" && cozum.sebep !== "http") {
        // Tanınmayan metin: düğmeden geldiyse söyle, yapıştırmada sus.
        if (kaynak === "dugme") {
          setUyari(
            cozum.sebep === "taninmayan-alan"
              ? "Bu alan adı izinli listede değil. Şu an yalnız YouTube adresleri gömülebiliyor."
              : "Bu bir video adresi gibi görünmüyor. YouTube bağlantısını ya da 'Paylaş → Yerleştir' kodunu yapıştırın.",
          );
        }
        return false;
      }
      if (cozum.tur === "desteklenmiyor") {
        // Adres tanındı ama gömülemiyor. Yapıştırma yolunda metin editöre
        // düşmeye devam ediyor (bağlantı olur); düğme yolunda hiçbir şey
        // eklenmiyor — mesaj bu farkı söylemek zorunda, yoksa kullanıcı
        // eklenmemiş bir bağlantıyı arar.
        setUyari(
          kaynak === "dugme"
            ? `${cozum.platform} videosu editöre gömülemiyor. Şu an yalnız YouTube adresleri gömülebiliyor.`
            : `${cozum.platform} videosu editöre gömülemiyor; adres bağlantı olarak eklendi. Video için YouTube adresi kullanın.`,
        );
        return false;
      }
      if (cozum.tur === "yok" && cozum.sebep === "http") {
        setUyari(
          "Video adresi https ile başlamalı; http adresler tarayıcıda engellenip boş kutu bırakıyor.",
        );
        return false;
      }
      return false;
    },
    [editor],
  );

  // editorProps içindeki kapanışlar en güncel işlevi görsün.
  useEffect(() => {
    gorselYukleRef.current = (d) => void gorselleriYukle(d);
    videoYapistirRef.current = videoYapistir;
  }, [gorselleriYukle, videoYapistir]);

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
      <Toolbar
        editor={editor}
        onGorsel={(d) => void gorselleriYukle(d)}
        onVideo={videoYapistir}
        onUyari={setUyari}
      />
      {(kuyruk.length > 0 || uyari) && (
        <div className="editor-yukleme">
          {uyari && (
            <div className="editor-yukleme-uyari">
              <span>{uyari}</span>
              <button type="button" onClick={() => setUyari(null)} title="Kapat">
                <XIcon size={13} />
              </button>
            </div>
          )}
          {kuyruk.map((s) => (
            <div key={s.id} className={`editor-yukleme-satir ${s.durum}`}>
              <span className="eys-ad" title={s.ad}>
                {s.ad}
              </span>
              <span className="eys-bar">
                <span
                  className="eys-dolgu"
                  style={{ width: `${s.durum === "hata" ? 100 : s.yuzde}%` }}
                />
              </span>
              <span className="eys-not">
                {s.durum === "kucultuluyor"
                  ? "küçültülüyor…"
                  : s.durum === "hata"
                    ? (s.not ?? "hata")
                    : s.durum === "bitti"
                      ? (s.not ?? "eklendi")
                      : `${s.yuzde}%${s.not ? ` · ${s.not}` : ""}`}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="editor-content">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Toolbar({
  editor,
  onGorsel,
  onVideo,
  onUyari,
}: {
  editor: Editor;
  onGorsel: (dosyalar: File[]) => void;
  onVideo: (metin: string, kaynak?: "yapistirma" | "dugme") => boolean;
  onUyari: (mesaj: string | null) => void;
}) {
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
    // ÇOKLU seçim — eskiden yoktu ve yalnız files[0] okunuyordu.
    input.multiple = true;
    input.onchange = () => {
      const dosyalar = Array.from(input.files ?? []);
      if (dosyalar.length > 0) onGorsel(dosyalar);
    };
    input.click();
  }, [onGorsel]);

  const addYoutube = useCallback(() => {
    const ham = window.prompt(
      "Video adresi (YouTube bağlantısı ya da 'Paylaş → Yerleştir' kodu):",
    );
    if (!ham) return;
    // Aynı çözümleyici yapıştırma yolunda da çalışıyor: iki yol iki farklı
    // kural uygulasaydı düğmeyle çalışan adres yapıştırınca çalışmazdı.
    // Fark yalnız SESSİZLİKTE: düğme bir adres BEKLİYOR, o yüzden tanınmayan
    // adres burada söylenir; yapıştırmada söylenmez (sıradan metin
    // yapıştıran kullanıcıya her seferinde uyarı çıkardı).
    onVideo(ham, "dugme");
  }, [onVideo]);

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
      <B
        onClick={addImage}
        title="Görsel yükle (birden fazla seçebilirsin; sürükleyip bırakmak ya da yapıştırmak da olur)"
      >
        <ImagePlus size={16} />
      </B>
      <B
        onClick={addYoutube}
        title="Video ekle (YouTube adresini doğrudan içeriğe yapıştırmak da yeter)"
      >
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
