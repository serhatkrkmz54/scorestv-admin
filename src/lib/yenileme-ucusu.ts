/**
 * TEK UÇUŞ OTURUM YENİLEME — aynı yenileme token'ıyla gelen eşzamanlı
 * istekler Teleskor'a TEK istek atar, hepsi aynı sonucu alır.
 *
 * <h3>Neden (29 Eylül 2026, ÖLÇÜLDÜ)</h3>
 * Erişim token'ı 15 dakikada doluyor. Süresi dolduğu anda panel sayfası
 * açılırken middleware ve sayfanın paralel BFF istekleri AYNI yenileme
 * çerezini ayrı ayrı Teleskor'a gönderiyordu. İlki token'ı döndürüyor,
 * ikincisi "kullanılmış token tekrar sunuldu" sayılıyordu: Teleskor
 * hırsızlık sanıp yöneticinin telefonu dâhil BÜTÜN oturumlarını
 * kapatıyordu (üretimde iki kez, rotasyonla tekrar arası 0 sn).
 *
 * <h3>Nasıl</h3>
 * Anahtar yenileme token'ının kendisi. Başarılı sonuç {@link SAKLA_MS}
 * boyunca saklanıyor: tarayıcı yeni çerezi almadan önce yola çıkmış
 * istekler de eski çerezle gelip AYNI yeni token'ları alıyor. Başarısız
 * sonuç (401, ağ hatası) saklanmıyor. Harita `globalThis`'te: middleware
 * ve route handler'lar aynı süreçte ayrı modül kopyalarıyla yüklenebiliyor.
 */
export type YenilemeSonucu =
  | { ok: true; accessToken: string; refreshToken: string; expiresInSeconds?: number }
  | { ok: false; status: number };

const SAKLA_MS = 60_000;

type Kayit = { vaat: Promise<YenilemeSonucu>; bitis: number };
const kuresel = globalThis as unknown as { __tskYenilemeUcuslari?: Map<string, Kayit> };
const ucuslar: Map<string, Kayit> = (kuresel.__tskYenilemeUcuslari ??= new Map());

export function tekUcusYenile(
  yenilemeToken: string,
  cagir: () => Promise<YenilemeSonucu>,
): Promise<YenilemeSonucu> {
  const simdi = Date.now();
  for (const [anahtar, kayit] of ucuslar) {
    if (kayit.bitis < simdi) ucuslar.delete(anahtar);
  }
  const suren = ucuslar.get(yenilemeToken);
  if (suren) return suren.vaat;

  const vaat = cagir().catch((): YenilemeSonucu => ({ ok: false, status: 0 }));
  ucuslar.set(yenilemeToken, { vaat, bitis: simdi + SAKLA_MS });
  void vaat.then((sonuc) => {
    if (!sonuc.ok) ucuslar.delete(yenilemeToken);
  });
  return vaat;
}
