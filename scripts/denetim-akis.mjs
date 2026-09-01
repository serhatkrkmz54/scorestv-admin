#!/usr/bin/env node
/**
 * AKIŞ MODERASYONU — YAPISAL DENETİM.
 *
 * Bu depoda test altyapısı yok ve moderasyon uçları en hassas yüzey:
 * biri şikayet edilen içeriği SİLİYOR. Buradaki korumaların (ADMIN
 * denetimi, aynı köken denetimi) sessizce düşmesi hiçbir yerde hata
 * patlatmaz — yalnız uç herkese açılır.
 *
 * Kalıp sports-engine'deki `docs/olcum/denetim-*.py` betiklerinin
 * karşılığı: derlemenin yakalayamadığı KARARLARI koruyor.
 *
 *   node scripts/denetim-akis.mjs
 */
import { readFileSync } from "node:fs";

const ROTA = "src/app/api/teleskor/akis";
const oku = (p) => readFileSync(p, "utf8");

/**
 * Yorumları VE import satırlarını atıyor.
 *
 * Bir adın ANILMASI KULLANIM değildir — ve import satırı da bir anma.
 * Betiğin ilk hâli bunu atlamıştı: gövdeden `checkSameOrigin(req)`
 * çağrısı silindiğinde bile dosyanın başındaki import eşleşiyor ve
 * denetim TEMİZ diyordu. Negatif sınama yakaladı.
 */
function kod(metin) {
  return metin
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/^\s*import[\s\S]*?;$/gm, "");
}

let hata = 0;
const yaz = (tamam, mesaj) => {
  if (!tamam) hata++;
  console.log(`${tamam ? "  ✔" : "  ✘"} ${mesaj}`);
};

// ---------------------------------------------------------------------
console.log("1) Her rota ADMIN denetiminden geçiyor mu?");
const rotalar = [
  [`${ROTA}/route.ts`, false],
  [`${ROTA}/gonderi/[id]/route.ts`, true],
  [`${ROTA}/yorum/[id]/route.ts`, true],
  [`${ROTA}/sikayet/[id]/route.ts`, true],
];
for (const [yol, degistiren] of rotalar) {
  const s = kod(oku(yol));
  const ad = yol.replace(`${ROTA}/`, "");
  yaz(
    /await teleskorAdmin\(\)/.test(s) && /if \("error" in izin\)/.test(s),
    `${ad}: teleskorAdmin() çağrılıyor ve sonucu KONTROL EDİLİYOR`,
  );
  if (degistiren) {
    // ÖNCE aynı köken, SONRA iş: sıra tersine dönerse CSRF denetimi
    // işlem yapıldıktan sonra çalışır ve hiçbir şeyi korumaz.
    // ÇAĞRININ KENDİSİ aranıyor, adı değil: import satırı da adı
    // taşıyor ve onu "var" saymak korumayı sahte kılar.
    const kokenAt = s.indexOf("checkSameOrigin(req)");
    const isAt = s.indexOf("teleskorJson(");
    yaz(
      kokenAt > 0 && isAt > 0 && kokenAt < isAt,
      `${ad}: checkSameOrigin İŞTEN ÖNCE çağrılıyor`,
    );
    // Dönüş DEĞERLENDİRİLMELİ: çağırıp sonucu atmak hiçbir şeyi
    // korumaz ve derleyici de uyarmaz.
    yaz(
      /const bad = checkSameOrigin\(req\);\s*if \(bad\) return bad;/.test(s),
      `${ad}: checkSameOrigin sonucu KONTROL EDİLİYOR`,
    );
  }
}

// ---------------------------------------------------------------------
console.log("\n2) Sayfa kendi ADMIN denetimini yapıyor mu?");
{
  // Panelin kuralı: Teleskor sayfaları rolü KENDİ kontrol eder.
  const s = kod(oku("src/app/(panel)/teleskor/akis/page.tsx"));
  yaz(/user\?\.role !== "ADMIN"/.test(s), "sayfa role !== ADMIN diye bakıyor");
  yaz(/teleskorConfigured\(\)/.test(s), "Teleskor bağlantısı denetleniyor");
}

// ---------------------------------------------------------------------
console.log("\n3) Şikayetler HEDEF TÜRÜYLE gruplanıyor mu?");
{
  const s = kod(oku("src/components/TeleskorAkisClient.tsx"));
  // Yalnız kimlikle gruplasaydık 7 numaralı gönderi ile 7 numaralı
  // yorumun şikayetleri aynı karta düşerdi — iki AYRI kimlik uzayı.
  yaz(
    /`y\$\{s\.yorum_id\}`/.test(s) && /`g\$\{s\.gonderi_id\}`/.test(s),
    "grup anahtarı hem türü hem kimliği taşıyor",
  );
}

// ---------------------------------------------------------------------
console.log("\n4) Zaten silinmiş içerikte silme düğmesi gizleniyor mu?");
{
  const s = kod(oku("src/components/TeleskorAkisClient.tsx"));
  // Sunucu ikinci silmeye 404 dönüyor; düğmeyi göstermek yöneticiyi
  // bir hataya davet etmek olurdu.
  yaz(
    /gonderiSilinmis \? null :/.test(s),
    "silinmiş gönderide 'Gönderiyi sil' çizilmiyor",
  );
  yaz(
    /yorumSilinmis \? null :/.test(s),
    "silinmiş yorumda 'Yorumu sil' çizilmiyor",
  );
}

// ---------------------------------------------------------------------
console.log("\n5) Yorum şikayetinde GÖNDERİ de gösteriliyor mu?");
{
  const s = kod(oku("src/components/TeleskorAkisClient.tsx"));
  // Bağlam olmadan karar verilemez: "salak" yazan bir yorumun hedefi
  // gönderinin içeriği olabilir. Gönderi kutusu KOŞULSUZ çiziliyor;
  // yalnız yorum kutusu `yorumHedefi` koşuluna bağlı.
  const gonderiKutusu = s.indexOf("<Icerik");
  const yorumKutusu = s.indexOf("{yorumHedefi && (");
  yaz(
    gonderiKutusu > 0 && yorumKutusu > gonderiKutusu,
    "gönderi kutusu koşulsuz ve yorum kutusundan ÖNCE",
  );
}

// ---------------------------------------------------------------------
console.log("\n6) Silme düğmeleri AYRI mı? (biri gönderiyi, biri yorumu)");
{
  const s = kod(oku("src/components/TeleskorAkisClient.tsx"));
  // Tek düğmeye indirilseydi bir yorum yüzünden gönderiyi kaldırmak
  // tek dokunuş olurdu — orantısız bir karar.
  yaz(
    /apiTeleskorGonderiSil\(/.test(s) && /apiTeleskorYorumSil\(/.test(s),
    "iki ayrı silme çağrısı var",
  );
  yaz(
    /onGonderiSil/.test(s) && /onYorumSil/.test(s),
    "karta iki ayrı eylem geçiriliyor",
  );
}

// ---------------------------------------------------------------------
console.log("\n7) Yıkıcı işlemler ONAY penceresinden geçiyor mu?");
{
  const s = kod(oku("src/components/TeleskorAkisClient.tsx"));
  // Silme doğrudan çağrılsaydı yanlış dokunuş geri alınamaz olurdu.
  yaz(
    !/onClick=\{\(\) => apiTeleskorGonderiSil/.test(s) &&
      !/onClick=\{\(\) => apiTeleskorYorumSil/.test(s),
    "silme çağrıları düğmeye DOĞRUDAN bağlanmamış",
  );
  yaz(/TeleskorOnayModal/.test(s), "onay penceresi kullanılıyor");
  // BAYRAK FONKSİYON BAZINDA denetleniyor. Dosyada "tehlikeli: true"
  // ARANMASI yetmiyordu: iki silme yolu var ve biri false yapıldığında
  // diğeri deseni yine eşleştiriyordu — negatif sınama yakaladı.
  for (const [fn, beklenen] of [
    ["gonderiSil", "true"],
    ["yorumSil", "true"],
    ["sikayetKapat", "false"],
  ]) {
    const bas = s.indexOf(`function ${fn}(`);
    const son = s.indexOf("\n  }", bas);
    const govde = bas < 0 ? "" : s.slice(bas, son);
    yaz(
      govde.includes(`tehlikeli: ${beklenen}`),
      `${fn}: tehlikeli = ${beklenen}`,
    );
  }
}

// ---------------------------------------------------------------------
console.log("\n8) Menü girişi bağlı mı?");
{
  const s = kod(oku("src/components/Sidebar.tsx"));
  yaz(/href="\/teleskor\/akis"/.test(s), "kenar çubuğunda bağlantı var");
  yaz(
    /isTeleskorAkis = pathname\.startsWith\("\/teleskor\/akis"\)/.test(s),
    "etkin sekme vurgusu tanımlı",
  );
}

console.log(
  hata === 0
    ? "\nYAPISAL DENETİM TEMİZ ✔"
    : `\nYAPISAL DENETİM BAŞARISIZ — ${hata} sorun ✘`,
);
process.exit(hata === 0 ? 0 : 1);
