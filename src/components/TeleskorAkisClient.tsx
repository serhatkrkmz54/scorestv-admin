"use client";

import { useCallback, useEffect, useState } from "react";
import {
  apiTeleskorAkisSikayetler,
  apiTeleskorGonderiSil,
  apiTeleskorYorumSil,
  apiTeleskorAkisSikayetKapat,
  ApiError,
} from "@/lib/api-client";
import type { TeleskorAkisSikayeti } from "@/lib/types";
import { formatDate } from "@/lib/format";
import TeleskorOnayModal from "./TeleskorOnayModal";

/**
 * SOSYAL AKIŞ MODERASYONU — şikayet edilen gönderi ve yorumlar.
 *
 * <h3>Sohbet ekranından farkı: İKİ HEDEF TÜRÜ</h3>
 * Bir şikayetin hedefi gönderinin kendisi ya da altındaki bir yorum
 * olabiliyor. Ayrım {@code yorum_id} alanında — doluysa hedef yorum.
 * Yönetici her iki durumda da GÖNDERİYİ görüyor: "salak" yazan bir
 * yorumun hedefi gönderinin içeriği olabilir ve bağlam olmadan karar
 * verilemez.
 *
 * <h3>Üç farklı sonuç, üç farklı düğme</h3>
 * <ul>
 *   <li><b>Gönderiyi sil:</b> gönderi akıştan, profilden ve ödül
 *       dağıtımından düşer; yorumları da görünmez olur ve üstündeki
 *       BÜTÜN bekleyen şikayetler kapanır.</li>
 *   <li><b>Yorumu sil:</b> gönderiye DOKUNULMAZ, yalnız o yorum gider ve
 *       gönderinin yorum sayacı düşer.</li>
 *   <li><b>Yersiz bul:</b> içeriğe hiç dokunulmaz, şikayet kapanır.</li>
 * </ul>
 * Silme düğmeleri tek düğmeye indirilseydi bir yorum yüzünden gönderiyi
 * kaldırmak tek dokunuş olurdu — orantısız ve geri alınması yönetici
 * müdahalesi gerektiren bir karar.
 *
 * <h3>Satırlar HEDEF başına gruplanıyor</h3>
 * Aynı gönderiyi beş kişi şikayet ettiyse yönetici metni beş kez
 * okumasın. Sayı da bir bilgi ve kartta gösteriliyor.
 */
export default function TeleskorAkisClient() {
  const [satirlar, setSatirlar] = useState<TeleskorAkisSikayeti[]>([]);
  const [loading, setLoading] = useState(true);
  const [hata, setHata] = useState<string | null>(null);
  const [onay, setOnay] = useState<{
    baslik: string;
    uyari: string;
    tehlikeli: boolean;
    onayMetni: string;
    calistir: () => Promise<void>;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSatirlar(await apiTeleskorAkisSikayetler(100));
      setHata(null);
    } catch (e) {
      setHata(e instanceof ApiError ? e.message : "Şikayetler alınamadı.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // HEDEF BAŞINA GRUPLAMA. Anahtar hem türü hem kimliği taşıyor:
  // yalnız kimlikle gruplasaydık 7 numaralı gönderi ile 7 numaralı
  // yorumun şikayetleri aynı karta düşerdi — iki ayrı kimlik uzayı.
  const gruplar = new Map<string, TeleskorAkisSikayeti[]>();
  for (const s of satirlar) {
    const anahtar =
      s.yorum_id != null ? `y${s.yorum_id}` : `g${s.gonderi_id}`;
    const liste = gruplar.get(anahtar) ?? [];
    liste.push(s);
    gruplar.set(anahtar, liste);
  }

  function gonderiSil(g: TeleskorAkisSikayeti[]) {
    const ilk = g[0];
    setOnay({
      baslik: "Gönderiyi sil",
      uyari:
        `${ilk.gonderi_yazari ?? "?"} kullanıcısının tahmin gönderisi ` +
        "silinecek. Gönderi akıştan ve profilinden düşer, ALTINDAKİ " +
        "YORUMLAR da görünmez olur ve bu gönderiye açılan bekleyen " +
        "şikayetlerin hepsi kapanır. Tahmin tutsa bile Telepuan ödülü " +
        "verilmez (kayıp da yazılmaz, iptal edilir). Kayıt kanıt olarak " +
        "veritabanında kalır.",
      tehlikeli: true,
      onayMetni: "Gönderiyi sil",
      calistir: async () => {
        await apiTeleskorGonderiSil(ilk.gonderi_id);
        await load();
      },
    });
  }

  function yorumSil(g: TeleskorAkisSikayeti[]) {
    const ilk = g[0];
    setOnay({
      baslik: "Yorumu sil",
      uyari:
        `${ilk.yorum_yazari ?? "?"} kullanıcısının yorumu silinecek ve bu ` +
        `yoruma açılan ${g.length} şikayet kapanacak. GÖNDERİYE ` +
        "DOKUNULMAZ; yerinde kalır ve görünmeye devam eder. Kayıt kanıt " +
        "olarak veritabanında kalır.",
      tehlikeli: true,
      onayMetni: "Yorumu sil",
      calistir: async () => {
        await apiTeleskorYorumSil(ilk.yorum_id!);
        await load();
      },
    });
  }

  function sikayetKapat(s: TeleskorAkisSikayeti) {
    setOnay({
      baslik: "Şikayeti kapat",
      uyari:
        "Şikayet yersiz bulunmuş sayılacak. İçeriğe DOKUNULMAZ, yerinde " +
        "kalır ve kullanıcılara görünmeye devam eder.",
      tehlikeli: false,
      onayMetni: "Yersiz bul ve kapat",
      calistir: async () => {
        await apiTeleskorAkisSikayetKapat(s.sikayet_id);
        await load();
      },
    });
  }

  return (
    <div className="stack">
      <div className="spread">
        <div>
          <h1 className="page-title">Teleskor — Akış Şikayetleri</h1>
          <div className="muted" style={{ fontSize: 13 }}>
            Sosyal akışta kullanıcıların şikayet ettiği tahmin gönderileri ve
            yorumlar. Bekleyen şikayetler burada; kapatılanlar listeden düşer.
          </div>
        </div>
        <button className="btn" onClick={load}>
          Yenile
        </button>
      </div>

      {hata && <div className="alert alert-error">{hata}</div>}

      <div className="card card-pad">
        {loading ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Yükleniyor…
          </div>
        ) : gruplar.size === 0 ? (
          <div className="muted" style={{ fontSize: 13 }}>
            Bekleyen şikayet yok.
          </div>
        ) : (
          <div className="stack">
            {[...gruplar.entries()].map(([anahtar, g]) => (
              <SikayetKarti
                key={anahtar}
                grup={g}
                onGonderiSil={() => gonderiSil(g)}
                onYorumSil={() => yorumSil(g)}
                onKapat={sikayetKapat}
              />
            ))}
          </div>
        )}
      </div>

      {onay && (
        <TeleskorOnayModal
          baslik={onay.baslik}
          uyari={onay.uyari}
          alanEtiketi="Not (isteğe bağlı — yalnız kendi kaydın için)"
          alanIpucu="Boş bırakabilirsin"
          // Teleskor bu uçlarda gerekçe İSTEMİYOR; alan zorunlu
          // yapılsaydı sunucunun sormadığı bir şeyi dayatmış olurduk.
          zorunlu={false}
          onayMetni={onay.onayMetni}
          tehlikeli={onay.tehlikeli}
          onKapat={() => setOnay(null)}
          onOnayla={async () => {
            await onay.calistir();
            setOnay(null);
            setHata(null);
          }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------

function SikayetKarti({
  grup,
  onGonderiSil,
  onYorumSil,
  onKapat,
}: {
  grup: TeleskorAkisSikayeti[];
  onGonderiSil: () => void;
  onYorumSil: () => void;
  onKapat: (s: TeleskorAkisSikayeti) => void;
}) {
  const ilk = grup[0];
  const yorumHedefi = ilk.yorum_id != null;
  const gonderiSilinmis = ilk.gonderi_silindi != null;
  const yorumSilinmis = ilk.yorum_silindi != null;

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 10,
        padding: 14,
      }}
    >
      <div className="spread" style={{ alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13.5 }}>
            {/* HEDEF TÜRÜ EN BAŞTA: yöneticinin ilk sorusu "neye
                bakıyorum". Aşağıdaki iki kutu her zaman aynı sırada
                (önce gönderi, sonra yorum) ve bu rozet olmadan hangisinin
                şikayet edildiği ancak düğmelere bakarak anlaşılırdı. */}
            <span className="badge">
              {yorumHedefi ? "Yorum şikayeti" : "Gönderi şikayeti"}
            </span>
            <span className="muted" style={{ fontWeight: 400, marginLeft: 8 }}>
              maç #{ilk.mac_id}
            </span>
            {grup.length > 1 && (
              <span className="badge" style={{ marginLeft: 8 }}>
                {grup.length} şikayet
              </span>
            )}
          </div>
        </div>
      </div>

      {/* GÖNDERİ — yorum şikayetinde de gösteriliyor (bağlam). */}
      <Icerik
        etiket={
          yorumHedefi
            ? `Alıntılanan gönderi · ${ilk.gonderi_yazari ?? "?"}`
            : `Gönderi · ${ilk.gonderi_yazari ?? "?"}`
        }
        tahmin={`${ilk.pazar} → ${ilk.secim}`}
        metin={ilk.gonderi_metni}
        silinmis={gonderiSilinmis}
        // Yorum şikayetinde gönderi SOLGUN: hedef o değil, bağlam.
        vurgulu={!yorumHedefi}
        eylem={
          gonderiSilinmis ? null : (
            <button className="btn btn-sm btn-danger" onClick={onGonderiSil}>
              Gönderiyi sil
            </button>
          )
        }
      />

      {yorumHedefi && (
        <Icerik
          etiket={`Şikayet edilen yorum · ${ilk.yorum_yazari ?? "?"}`}
          metin={ilk.yorum_metni}
          silinmis={yorumSilinmis}
          vurgulu
          eylem={
            yorumSilinmis ? null : (
              <button className="btn btn-sm btn-danger" onClick={onYorumSil}>
                Yorumu sil
              </button>
            )
          }
        />
      )}

      <div style={{ marginTop: 10 }}>
        {grup.map((s) => (
          <div
            key={s.sikayet_id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 0",
              borderTop: "1px solid var(--border)",
              fontSize: 12.5,
            }}
          >
            <span style={{ flex: 1 }}>
              <b>Sebep:</b> {s.sebep || "—"}
              <span className="muted" style={{ marginLeft: 8 }}>
                #{s.sikayet_eden} · {formatDate(s.created_at)}
              </span>
            </span>
            <button className="btn btn-sm" onClick={() => onKapat(s)}>
              Yersiz bul
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Tek bir içerik kutusu (gönderi ya da yorum).
 *
 * <p>ZATEN SİLİNMİŞ içerikte silme düğmesi GÖSTERİLMİYOR: sunucu ikinci
 * silmeye 404 dönüyor ve düğmeyi göstermek yöneticiyi bir hataya davet
 * etmek olurdu. Kutu yine de çiziliyor — şikayetin neye açıldığı
 * görünmeli.
 */
function Icerik({
  etiket,
  tahmin,
  metin,
  silinmis,
  vurgulu,
  eylem,
}: {
  etiket: string;
  tahmin?: string;
  metin: string | null;
  silinmis: boolean;
  vurgulu: boolean;
  eylem: React.ReactNode;
}) {
  return (
    <div
      style={{
        marginTop: 10,
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        opacity: vurgulu && !silinmis ? 1 : 0.62,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="muted" style={{ fontSize: 12 }}>
          {etiket}
          {silinmis && (
            <span className="badge" style={{ marginLeft: 8 }}>
              Silinmiş
            </span>
          )}
        </div>
        <div
          style={{
            marginTop: 5,
            padding: "10px 12px",
            background: "var(--pill, rgba(0,0,0,0.04))",
            borderRadius: 8,
            fontSize: 13.5,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {tahmin && (
            <div style={{ fontWeight: 600, marginBottom: metin ? 6 : 0 }}>
              {tahmin}
            </div>
          )}
          {/* METİN BOŞ OLABİLİR: gönderide yorum yazmak isteğe bağlı.
              Boş bir kutu göstermek yerine bunu açıkça söylüyoruz —
              yönetici "metin yüklenmedi mi?" diye düşünmesin. */}
          {metin && metin.trim().length > 0 ? (
            metin
          ) : (
            <span className="muted">(metin yok — yalnız tahmin)</span>
          )}
        </div>
      </div>
      {eylem}
    </div>
  );
}
