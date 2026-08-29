// Backend (Spring) sözleşmesiyle birebir eşleşen tipler.

// ---- Auth ----
export type Role = "ADMIN" | "EDITOR" | "USER";

export interface AppUser {
  id: number;
  email: string;
  displayName: string;
  role: Role;
  birthDate: string | null; // ISO yyyy-MM-dd
  age: number | null;
  country: string | null;
  hasPassword?: boolean;
}

// /api/v1/auth/* başarılı yanıtı (AuthResponse.java)
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number; // saniye
  user: AppUser;
}

// GlobalExceptionHandler standart hata gövdesi
export interface BackendError {
  status: number;
  message: string;
  errors?: Record<string, string>;
}

// ---- News (haber) ----
// NewsStatus.java
export type NewsStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED" | "ARCHIVED";

// NewsCategory.java
export type NewsCategory =
  | "TRANSFER"
  | "MATCH"
  | "INJURY"
  | "INTERVIEW"
  | "PREVIEW"
  | "RESULT"
  | "GENERAL";

// Backend NewsListItem — NOT: status alanı yok (public+admin ortak DTO).
// Admin liste durum sekmesi backend'e status filtresi göndererek çözülür.
export interface NewsListItem {
  id: number;
  slug: string;
  lang: string; // "tr" | "en"
  title: string;
  summary: string | null;
  coverImageUrl: string | null;
  category: NewsCategory | null;
  sport: string | null;
  isBreaking: boolean;
  isFeatured: boolean;
  publishedAt: string | null; // ISO Instant
  readingMinutes: number | null;
}

// NewsPageResponse.java
export interface NewsPageResponse {
  items: NewsListItem[];
  totalCount: number;
  hasNext: boolean;
}

// ---- Dashboard (panel ana sayfa özeti) — NewsStats.java ile birebir ----
export interface NewsStatsTrendPoint {
  date: string; // yyyy-MM-dd (yerel gün)
  count: number;
}
export interface NewsStatsTopArticle {
  id: number;
  title: string;
  slug: string;
  lang: string;
  status: NewsStatus;
  viewCount: number;
  publishedAt: string | null; // ISO Instant
}
export interface NewsStatsEditor {
  authorId: number;
  name: string;
  total: number;
  published: number;
}
export interface NewsStatsActivity {
  action: string; // CREATE | UPDATE | PUBLISH | UNPUBLISH | DELETE
  articleId: number | null;
  articleTitle: string | null;
  actorId: number | null;
  actorName: string | null;
  at: string | null; // ISO Instant
}
export interface NewsStats {
  total: number;
  published: number;
  draft: number;
  scheduled: number;
  archived: number;
  totalViews: number;
  publishedToday: number;
  publishedThisWeek: number;
  publishedThisMonth: number;
  breaking: number;
  featured: number;
  trend: NewsStatsTrendPoint[];
  topViewed: NewsStatsTopArticle[];
  editors: NewsStatsEditor[];
  recentActivity: NewsStatsActivity[];
}

// ---- Toplu (bulk) işlem — BulkNewsRequest.java / BulkResult.java ----
export type BulkAction =
  | "PUBLISH"
  | "UNPUBLISH"
  | "ARCHIVE"
  | "SET_CATEGORY"
  | "SET_SPORT"
  | "DELETE";

export interface BulkNewsRequest {
  ids: number[];
  action: BulkAction;
  category?: NewsCategory | null; // yalnız SET_CATEGORY
  sport?: string | null; // yalnız SET_SPORT
}

export interface BulkResult {
  processed: number; // işlenen haber sayısı
  skipped: number; // bulunamayıp atlanan
}

// NewsDetail.EntityRef
export interface EntityRef {
  id: number;
  name: string;
  logo: string | null;
}

// NewsDetail.FixtureRef — bagli mac hafif referansi.
// name = "Ev - Deplasman", logo = ev takimi logosu (varsa), kickoff = mac zamani.
export interface FixtureRef {
  id: number;
  name: string;
  logo: string | null;
  kickoff: string | null; // ISO Instant
}

// NewsDetail.java — admin detay (her durum) + bağlı varlıklar.
export interface NewsDetail {
  id: number;
  slug: string;
  lang: string;
  title: string;
  summary: string | null;
  body: string; // sanitize edilmiş HTML
  coverImageUrl: string | null;
  coverImageKey: string | null; // MinIO anahtarı — düzenleme/çeviride kapağı korumak için
  status: NewsStatus;
  category: NewsCategory | null;
  sport: string | null;
  isBreaking: boolean;
  isFeatured: boolean;
  inSlider: boolean; // web slider'da göster
  sliderOrder: number; // slider sırası (küçükten büyüğe)
  authorName: string | null;
  viewCount: number;
  readingMinutes: number | null;
  source: string | null;
  sourceUrl: string | null;
  publishedAt: string | null; // ISO Instant
  translationGroupId: number | null;
  availableLangs: string[];
  teams: EntityRef[];
  leagues: EntityRef[];
  countries: EntityRef[];
  players: EntityRef[];
  fixtures: FixtureRef[];
}

/**
 * CreateNewsRequest / UpdateNewsRequest (Java) ile birebir eşleşen istek
 * gövdesi. coverImageKey — yüklenen görselin MinIO anahtarı (URL değil).
 * sendPush + pushTarget: haber PUBLISHED'a geçtiğinde backend push tetikler
 * (sendPush=false ise gönderilmez; pushTarget verilmezse FAVORITES).
 */
export interface NewsRequest {
  lang: "tr" | "en";
  translationGroupId?: number | null;
  title: string;
  summary?: string | null;
  body: string;
  coverImageKey?: string | null;
  category?: NewsCategory | null;
  sport?: string | null;
  isBreaking: boolean;
  isFeatured: boolean;
  inSlider?: boolean; // web slider'da göster
  sliderOrder?: number; // slider sırası
  status?: NewsStatus | null;
  publishedAt?: string | null; // ISO Instant
  source?: string | null;
  sourceUrl?: string | null;
  teamIds?: number[];
  leagueIds?: number[];
  countryIds?: number[];
  playerIds?: number[];
  fixtureIds?: number[];
  sendPush?: boolean;
  pushTarget?: "ALL" | "FAVORITES";
}

// NewsAdminController.ImageUploadResult
export interface ImageUploadResult {
  key: string;
  url: string;
}

// NewsAdminController.MediaItem — medya kütüphanesi ögesi (yüklenmiş görsel).
export interface MediaItem {
  key: string;
  url: string;
  size: number;
  lastModified: string | null; // ISO Instant
}

// MediaUsage — bir görselin hangi haberde kullanıldığı (kapak/gövde).
export interface MediaUsage {
  articleId: number;
  title: string;
  slug: string;
  lang: string;
  status: string;
  cover: boolean; // haberin kapağı mı
  inBody: boolean; // haberin gövdesinde mi geçiyor
}

// Broadcast — habere/maça bağlı OLMAYAN genel push bildirimi.
export type BroadcastPlatform = "ALL" | "IOS" | "ANDROID";
export type BroadcastLang = "ALL" | "TR" | "EN";
export type BroadcastStatus = "QUEUED" | "SENT" | "FAILED";

export interface BroadcastRequest {
  title: string;
  body: string;
  link?: string | null; // opsiyonel; dokununca açılır
  platform: BroadcastPlatform;
  lang: BroadcastLang;
}

// Enqueue yanıtı — gönderim arka planda; status=QUEUED, sentCount=0 döner.
export interface BroadcastResult {
  id: number;
  status: BroadcastStatus;
  recipientCount: number; // hedeflenen cihaz
  sentCount: number; // FCM başarılı gönderim
}

export interface BroadcastListItem {
  id: number;
  title: string;
  body: string;
  link: string | null;
  platformTarget: BroadcastPlatform;
  langTarget: BroadcastLang;
  status: BroadcastStatus;
  recipientCount: number;
  sentCount: number;
  createdAt: string; // ISO Instant
}

// Test gönderimi — yalnızca bir e-postanın cihazlarına push (senkron).
export interface TestNotificationRequest {
  email: string;
  title: string;
  body: string;
  link?: string | null;
}

export interface TestNotificationResult {
  email: string;
  deviceCount: number; // hesaba bağlı, bildirimi açık cihaz
  sent: number; // FCM'e iletilen
  fcmEnabled: boolean; // sunucuda FCM aktif mi
}

// ---- Uygulama İstatistikleri (kendi DB'mizden — üye/cihaz/oyun KPI) ----
export interface AppStatsCountry {
  country: string;
  count: number;
}

export interface AppStats {
  // Üyeler
  usersTotal: number;
  usersNew24h: number;
  usersNew7d: number;
  usersNew30d: number;
  usersGoogle: number;
  usersApple: number;
  usersEmail: number;
  // Cihazlar (mobil)
  devicesTotal: number;
  devicesAndroid: number;
  devicesIos: number;
  devicesNotifOn: number;
  devicesLinked: number; // hesaba bağlı (giriş yapmış)
  devicesActive7d: number;
  devicesActive30d: number;
  topCountries: AppStatsCountry[];
  // Oyun
  gamePicksTotal: number;
  gamePlayers: number;
}

// ---- Maç-olay bildirim gönderimleri (takip) ----
// Backend NotificationDeliveryAdminController.DeliveryItem karşılığı.
export type NotificationOutboxStatus = "PENDING" | "SENT" | "FAILED";

export interface NotificationDelivery {
  id: number;
  kind: string; // GOAL | EVENT | KICKOFF | FINAL | HALFTIME | SECONDHALF | LINEUP
  notifType: string; // gol | kirmizi | penalti | basladi | bitti | ht | 2yari | kadro
  fixtureId: number;
  teamId: number | null;
  title: string;
  body: string;
  status: NotificationOutboxStatus;
  sendMode: string | null; // TOKEN | TOPIC | DUAL | NONE
  recipients: number | null; // token yolunda hedeflenen cihaz
  deliveredCount: number | null; // FCM başarılı teslim
  attempts: number;
  silent: boolean;
  lastError: string | null;
  createdAt: string; // ISO Instant
  sentAt: string | null; // ISO Instant
}

export interface NotificationDeliverySummary {
  pending: number;
  sent: number;
  failed: number;
}

// TranslateNewsRequest / TranslateNewsResult (Java) — DeepL tabanlı çeviri.
// body HTML tag-korumalı çevrilir. Kayıt oluşturmaz; sadece çevrilmiş metin.
export interface TranslateNewsRequest {
  title: string;
  summary: string;
  body: string;
  sourceLang: string; // "tr" | "en"
  targetLang: string; // "tr" | "en"
}
export interface TranslateNewsResult {
  title: string;
  summary: string;
  body: string;
}

// ---- Search (arama) — entity linking ----
// SearchResponse.java (public /api/v1/search)
export interface SearchTeamHit {
  id: number;
  name: string;
  nameTr: string | null;
  slug: string | null;
  country: string | null;
  countryTr: string | null;
  logoUrl: string | null;
}
export interface SearchLeagueHit {
  id: number;
  name: string;
  nameTr: string | null;
  slug: string | null;
  country: string | null;
  countryTr: string | null;
  type: string | null;
  logoUrl: string | null;
  flagUrl: string | null;
}
export interface SearchPlayerHit {
  id: number;
  name: string;
  slug: string | null;
  nationality: string | null;
  age: number | null;
  photoUrl: string | null;
}
export interface SearchCountryHit {
  id: number;
  name: string;
  nameTr: string | null;
  slug: string | null;
  code: string | null;
  flagUrl: string | null;
}
export interface SearchFixtureHit {
  id: number;
  slug: string | null;
  matchup: string | null;
  matchupTr: string | null;
  leagueId: number | null;
  leagueName: string | null;
  leagueNameTr: string | null;
  kickoff: string | null;
  statusShort: string | null;
}
export interface SearchResponse {
  query: string;
  tookMs: number;
  teams: SearchTeamHit[];
  leagues: SearchLeagueHit[];
  players: SearchPlayerHit[];
  fixtures: SearchFixtureHit[];
  countries: SearchCountryHit[];
  coaches: unknown[];
}

// ---- Ayarlar → Profil (mevcut auth uçlarına eşlenir) ----
// UpdateProfileRequest.java — PUT /api/v1/auth/me. birthDate + country backend
// tarafında ZORUNLUdur (@NotNull / @NotBlank), bu yüzden panelde de gönderilir.
export interface UpdateProfileRequest {
  displayName: string;
  birthDate: string; // yyyy-MM-dd
  country: string;
}

// ChangePasswordRequest.java — POST /api/v1/auth/change-password.
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ---- Ayarlar → Editör Yönetimi (ADMIN) ----
// AdminUserView.java — GET /api/v1/admin/users (şifre hash'i içermez).
export interface AdminUserView {
  id: number;
  email: string;
  displayName: string;
  role: Role;
  enabled: boolean;
}

// CreateEditorRequest.java - POST /api/v1/admin/users.
export interface CreateEditorRequest {
  email: string;
  displayName: string;
  password: string;
  role: "EDITOR" | "ADMIN";
}

// ---- EntityLinker secili varlik cipi (form state) ----
export type EntityKind = "team" | "league" | "player" | "country" | "fixture";

export interface EntityChip {
  kind: EntityKind;
  id: number;
  name: string;
  logo: string | null;
}

// ---- Yorum moderasyonu (AdminCommentView/Page.java) ----
export interface AdminCommentView {
  id: number;
  sport: string;
  matchId: number;
  content: string;
  deleted: boolean;
  createdAt: string | null;
  userId: number | null;
  userName: string | null;
  country: string | null;
  parentId: number | null;
}
export interface AdminCommentPage {
  items: AdminCommentView[];
  totalCount: number;
  hasNext: boolean;
}

// ---- Denetim günlüğü (NewsAuditView/Page.java) ----
export interface NewsAuditView {
  id: number;
  action: string;
  articleId: number | null;
  articleTitle: string | null;
  actorId: number | null;
  actorName: string | null;
  at: string | null;
  meta: string | null;
}
export interface NewsAuditPage {
  items: NewsAuditView[];
  totalCount: number;
  hasNext: boolean;
}

// ---- Slider / bayrak / zamanlama ----
export interface SaveSliderRequest {
  lang: string;
  ids: number[];
}
export interface UpdateFlagsRequest {
  isFeatured?: boolean | null;
  isBreaking?: boolean | null;
  inSlider?: boolean | null;
}
export interface RescheduleRequest {
  publishedAt: string | null;
  status?: NewsStatus | null;
}

// ---- İletişim mesajları (ContactMessageView.java / Spring Page) ----
export type ContactStatus = "NEW" | "READ" | "ARCHIVED";
export interface ContactAttachment {
  url: string;
  contentType: string | null;
  originalName: string | null;
  fileSize: number | null;
}
export interface ContactMessageView {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: ContactStatus;
  source: string | null; // "web" | "mobile"
  ipAddress: string | null;
  createdAt: string; // ISO Instant
  attachments: ContactAttachment[];
}
// Backend AdminContactController Spring Page<T> döner.
export interface ContactPage {
  content: ContactMessageView[];
  totalElements: number;
  number: number;
  last: boolean;
}

// ============================================================
// Oyun (Scores Coin — oyuncu düello tahmin oyunu) — ADMIN yönetimi.
// Backend: com.scorestv.game GameDtos + GameAdminController.
// ============================================================
// MATCHDAY: tek tur / maç günü yarışması (ör. "ŞL 3. Eleme Turu" — o günün maçları).
export type GameScope = "MATCHDAY" | "WEEKLY" | "MONTHLY" | "SEASON";
export type GameStatus = "DRAFT" | "OPEN" | "LOCKED" | "RESOLVED";
export type DuelStatus = "OPEN" | "RESOLVED" | "VOID";
export type DuelPosition = "GK" | "DEF" | "MID" | "FWD";
export type DuelDirection = "HIGHER" | "LOWER";
export type DuelMetric =
  | "RATING"
  | "GOALS"
  | "ASSISTS"
  | "KEY_PASSES"
  | "ASSISTS_KEYPASS"
  | "SHOTS_ON"
  | "SAVES"
  | "CLEAN_SHEET"
  | "DUELS_WON"
  | "TACKLES_INT"
  | "DRIBBLES"
  | "CARDS"
  | "FOULS";

// GET /api/v1/admin/game/competitions → List<GameCompetition> (entity).
export interface GameCompetitionItem {
  id: number;
  scope: GameScope;
  title: string;
  titleEn: string | null;
  sport: string;
  season: number | null;
  leagueId: number | null;
  startAt: string; // ISO Instant
  endAt: string;
  lockAt: string;
  status: GameStatus;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GamePlayerView {
  id: number;
  name: string | null;
  photo: string | null;
  team: string | null;
  teamLogo: string | null;
}

export interface GameDuelView {
  id: number;
  position: DuelPosition;
  metric: DuelMetric;
  direction: DuelDirection;
  status: DuelStatus;
  winner: string | null; // A | B | DRAW | VOID | null
  valueA: number | null;
  valueB: number | null;
  playerA: GamePlayerView;
  playerB: GamePlayerView;
  myPick: string | null;
  pickCountA: number;
  pickCountB: number;
}

// GET /api/v1/admin/game/competitions/{id} → CompetitionView (düellolarla).
export interface GameCompetitionView {
  id: number;
  scope: GameScope;
  title: string;
  titleEn: string | null;
  status: GameStatus;
  startAt: string;
  endAt: string;
  lockAt: string;
  /** Sonuçların açıklanacağı tahmini an (endAt + istatistik oturma payı). */
  resultsAt: string | null;
  locked: boolean;
  duels: GameDuelView[];
}

// GET /api/v1/admin/api-football/leagues/search — lig rehberi satırı.
export interface LeagueGuideRow {
  id: number;
  name: string; // İngilizce/API adı
  nameTr: string | null; // Türkçe ad (girilmemişse null) — panel TR'yi varsayar
  type: string | null; // League | Cup
  country: string | null;
  currentSeason: number | null;
  logo: string | null;
  covered: boolean;
}

export interface CreateCompetitionRequest {
  scope: GameScope;
  title: string;
  titleEn?: string | null;
  season?: number | null;
  leagueId?: number | null;
  startAt: string; // ISO Instant
  endAt: string;
  lockAt: string;
}

export interface GamePlayerRef {
  id: number;
  name?: string | null;
  photo?: string | null;
  team?: string | null;
  teamLogo?: string | null;
}

export interface CreateDuelRequest {
  position: DuelPosition;
  metric: DuelMetric;
  direction?: DuelDirection | null;
  sortOrder?: number | null;
  playerA: GamePlayerRef;
  playerB: GamePlayerRef;
}

// ---- Oyun: Scores Coin admin yönetimi ----
export interface AdminUserCoin {
  userId: number;
  email: string;
  displayName: string;
  coinBalance: number;
  lifetimeCoins: number;
}

export interface GrantCoinsResult {
  userId: number;
  coinBalance: number;
  lifetimeCoins: number;
}

// ---- Üyeler (admin kullanıcı yönetimi) ----
export type AppUserProvider = "google" | "apple" | "local";

export interface AdminAppUser {
  id: number;
  email: string;
  displayName: string;
  role: "ADMIN" | "EDITOR" | "USER";
  enabled: boolean;
  country: string | null;
  provider: AppUserProvider;
  createdAt: string | null;
}

export interface AdminAppUserPage {
  content: AdminAppUser[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface AdminAppUserStats {
  total: number;
  enabled: number;
  disabled: number;
  newLast7Days: number;
  byRole: Record<string, number>;
  google: number;
  apple: number;
  local: number;
}

export interface AdminAppUserListParams {
  query?: string;
  role?: "ADMIN" | "EDITOR" | "USER" | "";
  enabled?: "" | "true" | "false";
  provider?: AppUserProvider | "";
  page?: number;
  size?: number;
}

// ---- Muhabir Başvuruları (Saha Muhabiri programı) ----
export interface AdminReporterApplication {
  id: number;
  leagueName: string;
  region: string | null;
  message: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  reviewNote: string | null;
  leagueId: number | null;
  createdAt: string;
  reviewedAt: string | null;
  userId: number;
  userEmail: string | null;
  userDisplayName: string | null;
}

export interface AdminReporterApplicationPage {
  content: AdminReporterApplication[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

// ---- TELESKOR — Telepuan Marketi ----
//
// Bu tipler AYRI bir servisin (teleskor-backend) sözleşmesi; alan adları
// oradaki SQL sütunlarıyla birebir (snake_case) çünkü uçlar satırları
// olduğu gibi döndürüyor. camelCase'e çevirmek panelde ikinci bir eşleme
// katmanı doğururdu ve bir alan adı değiştiğinde hata TypeScript'te değil
// ekranda görünürdü.

export interface TeleskorMarketProduct {
  id: number;
  ad: string;
  aciklama: string | null;
  gorsel_url: string | null;
  /** TELEPUAN. Para değil — Telepuan satılmıyor, paraya çevrilmiyor. */
  fiyat: number;
  stok: number;
  /** Bir kullanıcı en fazla kaç tane alabilir; null = sınırsız. */
  kisi_basi_limit: number | null;
  aktif: boolean;
  sira: number;
  teslimat_notu_istiyor: boolean;
  teslimat_aciklamasi: string | null;
  created_at: string;
  updated_at: string;
  /** İptal edilmemiş sipariş sayısı — yalnız yönetici listesinde gelir. */
  satis?: number;
}

/** Ekleme/güncelleme gövdesi. Güncellemede gönderilmeyen alana DOKUNULMAZ. */
export interface TeleskorMarketProductRequest {
  ad?: string;
  aciklama?: string | null;
  gorselUrl?: string | null;
  fiyat?: number;
  stok?: number;
  kisiBasiLimit?: number | null;
  aktif?: boolean;
  sira?: number;
  teslimatNotuIstiyor?: boolean;
  teslimatAciklamasi?: string | null;
}

export type TeleskorOrderStatus = "HAZIRLANIYOR" | "TESLIM_EDILDI" | "IPTAL";

export interface TeleskorMarketOrder {
  id: number;
  user_id: number;
  username: string | null;
  email: string | null;
  urun_id: number;
  /** Sipariş anındaki ad — ürün sonradan değişse de bu satır değişmez. */
  urun_adi: string;
  /** Ödenen puan; iade tam bu kadar yapılır. */
  odenen_puan: number;
  durum: TeleskorOrderStatus;
  /** Kullanıcının yazdığı beden/adres — KİŞİSEL VERİ. */
  teslimat_notu: string | null;
  /** Kullanıcıya GÖSTERİLİYOR: kargo takip no, kupon kodu, iptal gerekçesi. */
  yonetici_notu: string | null;
  created_at: string;
  updated_at: string;
}

// ---- TELESKOR — Üye yönetimi ----
//
// Teleskor'un kendi kullanıcı tablosu. ScoresTV'nin `AdminAppUser` tipiyle
// KARIŞTIRMA: ayrı servis, ayrı veritabanı, ayrı roller. Aynı e-posta iki
// sistemde iki farklı kişi olabilir.

export type TeleskorRole = "USER" | "EDITOR" | "ADMIN";

export type TeleskorAccountStatus =
  | "ACTIVE"
  | "SELF_DEACTIVATED"
  | "SUSPENDED"
  | "DELETION_PENDING"
  | "ANONYMIZED";

export interface TeleskorUserSummary {
  id: number;
  username: string;
  email: string;
  displayName: string | null;
  role: TeleskorRole;
  status: TeleskorAccountStatus;
  emailVerified: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface TeleskorUserPage {
  content: TeleskorUserSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  hasNext: boolean;
}

export interface TeleskorUserDetail extends TeleskorUserSummary {
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  birthDate: string | null;
  phoneVerified: boolean;
  hasPassword: boolean;
  linkedProviders: string[];
  activeSessions: number;
  passwordChangedAt: string | null;
  deactivatedAt: string | null;
  deletionRequestedAt: string | null;
  anonymizedAt: string | null;
  updatedAt: string;
}

export interface TeleskorCreateUserRequest {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  phone?: string | null;
  birthDate?: string | null;
  role?: TeleskorRole;
  /** ZORUNLU — zincirli denetim kaydına yazılıyor. */
  reason: string;
}

/**
 * Kullanıcının Telepuan hareketi (yönetici görünümü).
 *
 * DİKKAT: bu uç ham SQL satırı DÖNDÜRMÜYOR — alanlar sunucuda elle
 * adlandırılıyor. Marketteki `created_at` alışkanlığıyla yazılınca ekranda
 * "Invalid Date" çıktı; buradaki ad `tarih`.
 */
export interface TeleskorPointEntry {
  miktar: number;
  tur: string;
  /** Yoksa BOŞ METİN gelir, null değil. */
  aciklama: string;
  /** İlişkili maç; yoksa -1 (null değil). */
  macId: number;
  /** ISO instant — `created_at` DEĞİL. */
  tarih: string;
}

export interface TeleskorPointAccount {
  bakiye: number;
  islemler: TeleskorPointEntry[];
}
