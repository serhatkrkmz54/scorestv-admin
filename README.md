# TELE SKOR Yönetim Paneli

Teleskor'un yönetim paneli (Next.js 16, App Router). Canlı adres
**panel.teleskor.com.tr** (api-1). Dağıtım: [DEPLOY.md](DEPLOY.md).

> Depo adı tarihsel (`scorestv-admin`): panel 28 Eylül 2026'ya kadar
> `addnews.scorestv.com`'da ScoresTV ile ortaktı. ScoresTV kendi panelini
> yapıyor; bu panel artık yalnız Teleskor'un.

## Mimari

- Tarayıcı Teleskor'a doğrudan gitmez; her şey panelin **BFF** rotalarından
  (`src/app/api/**`) geçer. Teleskor adresi `TELESKOR_BACKEND_URL`.
- **Giriş Teleskor hesabıyla** (e-posta ya da kullanıcı adı), yalnız rolü
  **ADMIN** olan hesaplar. Token'lar httpOnly çerezlerde (`tsk_panel_at` /
  `tsk_panel_rt`); erişim token'ı 15 dk, middleware süresi dolunca yeniler
  (yenileme render'da yapılmaz: Teleskor dönmüş token'ın tekrarını hırsızlık
  sayıp bütün oturumları kapatır).
- Teleskor istekleri yöneticinin **kendi token'ıyla** gider (`lib/teleskor.ts`);
  yetkiyi Teleskor denetler, denetim kaydı işlemi yapan kişiyi yazar.
- Panel gelen isteğin `CF-Connecting-IP` / `CF-IPCountry` başlıklarını ve
  "Yönetim paneli" cihaz adını Teleskor'a iletir (`lib/backend.ts`): giriş
  denemesi kilidi ve "yeni cihazdan giriş" e-postası kişinin kendi IP'siyle.
- Spor verisi düzeltmeleri (Kadro Masası, Veri/Çeviri Düzeltme, Motor)
  api-1 üzerinden motora gider; panel motorla doğrudan konuşmaz.

## Yerelde

```bash
npm install
cp .env.example .env.local   # TELESKOR_BACKEND_URL=http://localhost:8080
npm run dev -- -p 3100
```

Yerel api-1'de hazır yönetici: `serhatadmin` (DevDataSeeder).

## Sayfalar

Genel (Sistem Sağlığı) · İçerik (Haberler, Duyurular, Sürüm Notları, Maç
Özeti) · Spor verisi (Öne Çıkan Ligler, Kadro Masası, Veri Düzeltme, Çeviri
Düzeltme) · Üyeler ve topluluk (Üyeler, Kitle, Destek, Sohbet/Akış
Şikayetleri) · Tele Puan (Market, Siparişler) · Sistem (Uygulama Ayarları,
Sözleşmeler, Denetim Kaydı, Motor, Panel Ayarları).

## Betikler

| Komut           | İş                             |
| --------------- | ------------------------------ |
| `npm run dev`   | Geliştirme sunucusu            |
| `npm run build` | Üretim derlemesi (standalone)  |
| `npm run start` | Üretim sunucusu                |
