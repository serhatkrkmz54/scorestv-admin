# TELE SKOR Yönetim Paneli — Canlı Dağıtım

28 Eylül 2026: panel `addnews.scorestv.com`'dan (ScoresTV sunucusu) Teleskor'a
taşındı. ScoresTV kendi panelini yapıyor; bu panel yalnız Teleskor'un.

```
tarayıcı → Cloudflare → api-1 nginx (panel alt alanı)
         → 127.0.0.1:3200 (bu panel, Docker)
         → http://app:8080 (teleskor-backend, aynı Docker ağı)
```

- **Giriş Teleskor hesabıyla** (e-posta ya da kullanıcı adı). Yalnız rolü
  **ADMIN** olan hesaplar girer. Her istek o yöneticinin kendi oturumuyla
  gider: Teleskor'un denetim kaydı işlemi yapan kişiyi ve IP'sini yazar.
- Eski düzendeki **hizmet hesabı** (`TELESKOR_ADMIN_USER/PASSWORD`) ve
  ScoresTV backend bağlantısı (`BACKEND_URL`) kalktı.
- ScoresTV'nin sayfaları (haberler, yorumlar, oyun, bildirim, muhabirler,
  iletişim, slider, medya) panelden çıkarıldı.

---

## 0. Ön koşul — yönetici hesapları

Panele girecek herkesin Teleskor'da hesabı olmalı ve rolü ADMIN olmalı:
- Hesap yoksa uygulamadan ya da sitenin kayıt sayfasından açılır.
- Rol: panelde **Üyeler** → kişi → rol **Yönetici** (ilk yönetici zaten var).
  Veritabanından: `UPDATE users SET role='ADMIN' WHERE username='…';`

## Adres neden yazılmıyor

Panelin alt alan adı bilerek tahmin edilemez (`panel.`, `admin.` gibi adlar
alt alan tarayıcılarının listelerinde ilk sırada). Ad YALNIZ teleskor-backend
`altyapi/nginx-api.conf`'taki `server_name` satırında ve Cloudflare DNS'te
durur; bu belgeye, siteye, uygulamaya, e-postaya yazılmaz. Aşağıda `<PANEL>`
o addır. Gizli ad tek başına kilit değil: asıl koruma Teleskor girişi, isteğe
bağlı anahtar kapısı (`PANEL_GATE_*`) ve Cloudflare Access.

## 1. Cloudflare

1. **DNS** → Add record: Type `A`, Name = `<PANEL>`'in ilk parçası (nokta
   öncesi), Content = api-1'in IP'si, **Proxy açık** (turuncu bulut).
   Bu ad için AYRI kenar sertifikası (Advanced Certificate) alma: sertifika
   şeffaflık kayıtlarına düşer ve ad herkese açık olur. Universal SSL'in
   joker sertifikası yeterli ve adı ele vermez.
2. SSL/TLS **Full (strict)** zaten açık; origin sertifikası
   `*.teleskor.com.tr`'yi kapsıyor (takip alt alanları da onu kullanıyor).
   Yeni sertifika gerekmez.
3. Önerilen ek kilit: Zero Trust → Access ile `<PANEL>`'i
   yalnız belirli e-postalara açmak.

## 2. api-1 — paneli çalıştır

```bash
cd /opt/teleskor
git clone https://github.com/serhatkrkmz54/scorestv-admin.git panel
cd panel
cp .env.example .env        # anahtar kapısı isteniyorsa PANEL_GATE_* doldur
docker compose -f compose.prod.yaml up -d --build
docker compose -f compose.prod.yaml logs -f panel     # "Ready" görünce Ctrl+C
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:3200/login   # 200
```

teleskor-backend compose'u önce ayakta olmalı (`teleskor_default` ağını o
açıyor). Güncelleme: `git pull && docker compose -f compose.prod.yaml up -d --build`.

## 3. api-1 — nginx (İKİ ADIM: önce fark, sonra kopya)

Panel bloğu teleskor-backend `altyapi/nginx-api.conf`'un sonunda.

**Adım 1 — farkı gör, DUR:**
```bash
cd /opt/teleskor/teleskor-backend && git pull
diff -u /etc/nginx/sites-available/api.conf altyapi/nginx-api.conf
```
Farkta yalnız dosyanın sonuna eklenen YÖNETİM PANELİ bölümü
görünmeli. Başka bir fark varsa (sunucuda elle yapılmış değişiklik)
kopyalamadan önce o fark depoya alınmalı.

**Adım 2 — kopyala ve yeniden yükle:**
```bash
sudo cp altyapi/nginx-api.conf /etc/nginx/sites-available/api.conf
sudo nginx -t && sudo systemctl reload nginx
```

## 4. Doğrula

1. `https://<PANEL>` → giriş ekranı (TELE SKOR).
2. Teleskor yönetici hesabıyla gir → Sistem Sağlığı açılır.
3. Rolü USER olan bir hesapla dene → "yalnız yöneticiler" (403).
4. Bir ayar değiştir → Denetim Kaydı'nda işlem SENİN adınla ve gerçek IP'nle.

## 5. Taşımadan SONRA — eski düzeni kapat (güvenlik)

1. **Hizmet hesabını kapat.** Eski panelin Teleskor'a girdiği hesabın
   (`TELESKOR_ADMIN_USER`, örneğin `panel-servis`) şifresi ScoresTV
   sunucusundaki `.env`'de duruyor ve o sunucu artık ScoresTV'nin. Panelde
   **Üyeler** → o hesap → rolü **Kullanıcı** yap ya da hesabı askıya al.
   Rol düşünce eski panel Teleskor'da hiçbir şey yapamaz.
2. `addnews.scorestv.com`'u kapatmak ScoresTV'nin işi (eski panel
   konteyneri + nginx bloğu + DNS kaydı).

## Notlar

- Çerezler `tsk_panel_*`, yalnız panelin alt alanına yazılır.
- Güvenlik başlıkları (noindex, `X-Frame-Options: DENY`, `Referrer-Policy`)
  panelin kendisinden (`next.config.ts`); nginx yazmıyor (çift giderdi).
- Giriş ucu nginx'te gerçek IP başına dakikada 10 (+5) ile sınırlı; asıl
  kaba kuvvet koruması Teleskor'da. Panel `CF-Connecting-IP`'yi Teleskor'a
  iletiyor, yani kilit kişinin kendi IP'sine uygulanır.
- Şifre değişikliği panelden de yapılabilir (Panel Ayarları → Hesap);
  değişince diğer bütün oturumlar (telefondaki uygulama dâhil) kapanır.
