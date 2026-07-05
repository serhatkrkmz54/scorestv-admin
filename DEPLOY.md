# ScoresTV Editör Paneli — Canlı Dağıtım (addnews.scorestv.com)

Panel, public web'den **ayrı** bir Next.js uygulaması. Canlıda:
`https://addnews.scorestv.com` → nginx → `127.0.0.1:3200` (panel) → BFF → Spring backend.

Port haritası (production):
- `3001` = public web (scorestv.com)
- `3000` = Grafana
- **`3200` = bu panel** (yeni)
- `8080` = Spring backend

---

## 0. Ön koşul — Backend canlıda olmalı

Panelin girişi ve tüm uçları Spring backend'e bağlı. Önce:
1. Backend'i **Faz 1 haber kodu** ile derleyip deploy et (`V71` migration otomatik uygulanır).
2. Bir **EDITOR** veya **ADMIN** kullanıcı olsun (yoksa `AdminUserController` `POST /api/v1/admin/users` ile oluştur).

Backend çalışmıyorsa panelde giriş **503** verir (şu an bu yüzden 503 alıyorsun — lokalde backend kapalı).

---

## 1. Cloudflare — DNS + SSL

1. Cloudflare > scorestv.com > **DNS** > Add record:
   - Type `A`, Name `addnews`, Content = sunucu IP'si (scorestv.com ile aynı), **Proxy: Açık (turuncu bulut)**.
   - (Veya `CNAME addnews → scorestv.com`, proxied.)
2. **SSL/TLS mode = Full** (origin'de Cloudflare Origin Cert var — diğer subdomainlerle aynı). Zaten Full ise dokunma.

---

## 2. nginx — hazır

`scorestv-backend/nginx/scorestv.conf` dosyasına eklendi:
- `upstream nextjs_admin { server 127.0.0.1:3200; }`
- `server { server_name addnews.scorestv.com; ... }` (static cache + `/api` + SSR, login rate-limit, `noindex`, 25M upload).

Sunucuda config'i güncelle ve test et:
```bash
# scorestv.conf'u sunucudaki yerine kopyala (WinSCP / scp / git pull),
# sonra:
nginx -t && systemctl reload nginx      # ya da: docker exec <nginx> nginx -s reload
```

---

## 3. Paneli çalıştır — 2 seçenek

Panel `output: "standalone"` (Dockerfile hazır).

### Seçenek A — Docker (web ile aynı sistem, ÖNERİLEN)
```bash
cd /opt/scorestv/scorestv-admin        # repoyu sunucuya çek
docker build -t scorestv-admin:latest .
docker run -d --name scorestv-admin --restart unless-stopped \
  -p 127.0.0.1:3200:3200 \
  -e BACKEND_URL="https://api.scorestv.com" \
  scorestv-admin:latest
```
> `BACKEND_URL`: Container'dan backend'e nasıl ulaşıyorsan onu ver. Web container'ı hangi değeri kullanıyorsa **aynısını** kullan. Güvenli varsayılan: `https://api.scorestv.com`. Aynı docker network'te backend servis adı varsa `http://<backend-servis>:8080` daha hızlı. `127.0.0.1:8080` **container içini** işaret eder, host backend'e ulaşmaz — kullanma.

İstersen `docker-compose`'a servis olarak da ekleyebilirsin:
```yaml
  scorestv-admin:
    build: ./scorestv-admin
    restart: unless-stopped
    ports: ["127.0.0.1:3200:3200"]
    environment:
      BACKEND_URL: "https://api.scorestv.com"
```

### Seçenek B — Host'ta doğrudan (hızlı, container'sız)
```bash
cd /opt/scorestv/scorestv-admin
npm ci
npm run build
BACKEND_URL="http://127.0.0.1:8080" PORT=3200 HOSTNAME=0.0.0.0 \
  node .next/standalone/server.js
```
Kalıcı olması için **PM2** ya da systemd:
```bash
pm2 start "node .next/standalone/server.js" --name scorestv-admin \
  --env BACKEND_URL=http://127.0.0.1:8080 --env PORT=3200 --env HOSTNAME=0.0.0.0
pm2 save
```
> Host'ta çalıştığın için `BACKEND_URL=http://127.0.0.1:8080` en hızlısı ve doğrudan çalışır.

---

## 4. Doğrula

1. `https://addnews.scorestv.com` → giriş ekranı gelmeli.
2. EDITOR/ADMIN hesabıyla gir → haber listesi.
3. Bir deneme haberi oluştur → kaydet → yayınla.

---

## Notlar / Güvenlik

- Panel çerezleri public web'den **ayrı** (`stv_admin_*`), aynı ana domain altında çakışmaz.
- Panel `noindex` + `robots.txt Disallow: /` — arama motorlarına düşmez.
- Sadece **EDITOR/ADMIN** girebilir (panel rol-guard + backend `@PreAuthorize`).
- Eğer giriş/mutasyon **403** verirse: panel origin-check'i `X-Forwarded-Proto/Host` başlıklarına güveniyor mu bak (nginx bunları set ediyor). Gerekirse panelde origin doğrulamasına `addnews.scorestv.com` host'unu ekleriz.
- Güncelleme akışı: kod değişince → (Docker) `docker build` + `docker restart scorestv-admin`, ya da (host) `npm run build` + `pm2 restart scorestv-admin`. Backend/panel = anında; mobil değil.
