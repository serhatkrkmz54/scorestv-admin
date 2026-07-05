# ScoresTV Editör Paneli (scorestv-admin)

EDITOR/ADMIN kullanıcılarının haber (news) yönettiği **ayrı** bir Next.js
uygulaması. Gelecekte `admin.scorestv.com` alt alan adında yayınlanacak. Public
web (`scorestv_web`) ile aynı Spring backend'ini kullanır; ona **BFF** (Backend
For Frontend) rotaları üzerinden erişir — tarayıcı backend'e asla doğrudan
bağlanmaz.

## Gereksinimler

- Node.js 20+
- Çalışan ScoresTV Spring backend (varsayılan `http://localhost:8080`)
- Backend'de rolü **EDITOR** veya **ADMIN** olan bir kullanıcı hesabı

## Kurulum

```bash
npm install
cp .env.example .env.local   # veya .env
npm run dev
```

Public web de 3000 portunda çalışıyorsa çakışmayı önlemek için:

```bash
npm run dev -- -p 3100
```

Tarayıcıda `http://localhost:3000` (veya seçtiğiniz port) → `/login`.

## Ortam değişkeni

| Değişken      | Açıklama                                   | Varsayılan              |
| ------------- | ------------------------------------------ | ----------------------- |
| `BACKEND_URL` | Spring backend taban URL'i (public web ile aynı ad) | `http://localhost:8080` |

`.env.example` dosyasını `.env.local`'e kopyalayıp değeri ayarlayın.

## Betikler

| Komut           | İş                          |
| --------------- | --------------------------- |
| `npm run dev`   | Geliştirme sunucusu         |
| `npm run build` | Üretim derlemesi (standalone) |
| `npm run start` | Üretim sunucusu             |
| `npm run lint`  | ESLint                      |

## Kimlik doğrulama & yetkilendirme

- Giriş: `/login` → BFF `POST /api/auth/login` → backend `POST /api/v1/auth/login`.
  Backend token'ları **gövdede** döner; panel bunları `httpOnly` çerezlere
  (`stv_admin_at` / `stv_admin_rt`) yazar. Çerez isimleri public web'den ayrıdır.
- **Rol kapısı:** Yalnızca EDITOR/ADMIN girebilir. Kontrol iki katmanlı:
  1. `middleware.ts` — çerez yoksa `/login`'e yönlendirir (kaba kapı, Edge).
  2. `app/(panel)/layout.tsx` — `/api/v1/auth/me` ile rolü doğrular; EDITOR/ADMIN
     değilse `/login`'e yönlendirir (asıl kapı, sunucu).
  Ayrıca login BFF rotası da USER rolünü reddeder (token yazmaz).
- **Sil** butonu yalnızca ADMIN'e görünür (backend `DELETE` de yalnız ADMIN'e
  açıktır — 403 döner).

## Backend uçları (hedeflenen)

| Panel BFF                          | Backend                                    |
| ---------------------------------- | ------------------------------------------ |
| `POST /api/auth/login`             | `POST /api/v1/auth/login`                  |
| `POST /api/auth/logout`            | `POST /api/v1/auth/logout`                 |
| `GET  /api/auth/me`                | `GET  /api/v1/auth/me`                     |
| `GET  /api/news`                   | `GET  /api/v1/admin/news`                  |
| `POST /api/news`                   | `POST /api/v1/admin/news`                  |
| `GET  /api/news/{id}`              | `GET  /api/v1/admin/news/{id}`             |
| `PUT  /api/news/{id}`              | `PUT  /api/v1/admin/news/{id}`             |
| `DELETE /api/news/{id}`            | `DELETE /api/v1/admin/news/{id}` (ADMIN)   |
| `POST /api/news/{id}/publish`      | `POST /api/v1/admin/news/{id}/publish`     |
| `POST /api/news/{id}/unpublish`    | `POST /api/v1/admin/news/{id}/unpublish`   |
| `POST /api/news/images`            | `POST /api/v1/admin/news/images` (multipart) |
| `GET  /api/search`                 | `GET  /api/v1/search`                      |

Tüm mutasyon (POST/PUT/DELETE) BFF rotaları basit **Origin** kontrolü yapar
(CSRF savunması). Auth'lu istekler 401'de bir kez refresh + retry dener.

## Sayfalar

- `/login` — Giriş.
- `/` — Haber Listesi: durum sekmeleri (Tümü/Taslak/Zamanlanmış/Yayında/Arşiv),
  arama, dil/kategori/spor filtreleri, sayfalı tablo. Satır aksiyonları: Düzenle,
  Yayınla/Geri Çek, Önizle, Kopyala, Sil (yalnız ADMIN).
- `/news/new` — Yeni haber (`?copyFrom=ID` ile kopyalayarak başlar).
- `/news/{id}/edit` — Düzenleme.
- `/news/{id}/preview` — Yayın önizlemesi (salt-okunur).

## Zengin metin editörü (TipTap)

Kalın/italik/altı-çizili/üstü-çizili, H2–H4, madde/sıralı liste, alıntı, bağlantı
ekle/kaldır, görsel yükle (→ `/api/news/images`), YouTube gömme, tablo, yatay
çizgi, metin hizalama, geri/ileri al. Çıktı `editor.getHTML()` ile alınır;
backend `NewsSanitizer` ile ayrıca temizler.

## Notlar / insan doğrulaması gereken noktalar

- **Bildirim bölümü:** Form "Bildirim" bölümü (Herkes / İlgili favoriler +
  "Yayınlarken bildirim gönder") **yalnızca arayüzdür**. Backend
  `CreateNewsRequest` / `UpdateNewsRequest` DTO'sunda bildirim alanı YOKTUR, bu
  yüzden bu değerler isteğe **eklenmez** (400'ü önlemek için). Backend bu alanları
  destekleyecek şekilde genişletildiğinde `NewsForm.tsx` içindeki
  `buildRequest()`'e eklenmelidir (kodda TODO/NOT olarak işaretli).
- **Kapak görseli:** Backend detayları yalnızca `coverImageUrl` döner (key değil).
  Düzenlemede önceki kapak URL'i önizlenir; değiştirmek için yeniden yükleyip yeni
  `coverImageKey` üretilir. Kapak değiştirilmezse `coverImageKey` null gönderilir —
  backend'in bunu "mevcut kapağı koru" olarak yorumladığını doğrulayın (aksi hâlde
  düzenlemede kapak sıfırlanabilir).
- **Liste durumu:** `NewsListItem` DTO'su `status` alanı içermez; liste durumu
  aktif sekmeye göre filtrelenir. "Yayınla/Geri Çek" ayrımı da sekme bağlamına göre
  gösterilir.
- **Spor filtresi:** Backend admin liste ucu `sport` parametresini kabul etmez;
  spor filtresi istemci tarafında (sayfa içinde) uygulanır.
- **Çerez isimleri:** `stv_admin_at` / `stv_admin_rt`. Public web `stv_at`/`stv_rt`
  kullanır; alt alan adı dağıtımında çakışma olmaması için ayrı tutulmuştur.
```
