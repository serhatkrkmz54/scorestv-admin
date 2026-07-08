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

// ---- EntityLinker seçili varlık çipi (form state) ----
export type EntityKind = "team" | "league" | "player" | "country" | "fixture";

export interface EntityChip {
  kind: EntityKind;
  id: number;
  name: string;
  logo: string | null;
}
