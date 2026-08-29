"use client";

// Tarayıcı tarafından çağrılan yardımcılar — hepsi kendi BFF rotalarımıza
// gider (backend'e ASLA doğrudan değil). Çerezler otomatik iletilir.

import type {
  AdminUserView,
  AppUser,
  BroadcastListItem,
  BroadcastRequest,
  BroadcastResult,
  TestNotificationRequest,
  TestNotificationResult,
  AppStats,
  ChangePasswordRequest,
  CreateEditorRequest,
  ImageUploadResult,
  BulkNewsRequest,
  BulkResult,
  MediaItem,
  MediaUsage,
  NewsDetail,
  NewsPageResponse,
  NewsRequest,
  NewsStats,
  NewsListItem,
  NotificationDelivery,
  NotificationDeliverySummary,
  AdminCommentPage,
  NewsAuditPage,
  SaveSliderRequest,
  UpdateFlagsRequest,
  RescheduleRequest,
  ContactPage,
  ContactMessageView,
  ContactStatus,
  SearchResponse,
  TranslateNewsRequest,
  TranslateNewsResult,
  UpdateProfileRequest,
  GameCompetitionItem,
  LeagueGuideRow,
  GameCompetitionView,
  CreateCompetitionRequest,
  CreateDuelRequest,
  GameStatus,
  AdminUserCoin,
  GrantCoinsResult,
  AdminAppUser,
  AdminAppUserPage,
  AdminAppUserStats,
  AdminAppUserListParams,
  AdminReporterApplication,
  AdminReporterApplicationPage,
  TeleskorMarketProduct,
  TeleskorMarketProductRequest,
  TeleskorMarketOrder,
  TeleskorOrderStatus,
  TeleskorUserPage,
  TeleskorUserDetail,
  TeleskorCreateUserRequest,
  TeleskorRole,
  TeleskorPointAccount,
} from "./types";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string>;
  constructor(status: number, message: string, errors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function parse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }
  if (!res.ok) {
    const b = (body ?? {}) as { message?: string; errors?: Record<string, string> };
    throw new ApiError(res.status, b.message ?? "Bir hata oluştu.", b.errors);
  }
  return body as T;
}

const jsonInit = (method: string, data?: unknown): RequestInit => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: data === undefined ? undefined : JSON.stringify(data),
});

// ---- Auth ----
export async function apiLogin(
  email: string,
  password: string,
  rememberMe: boolean,
): Promise<AppUser> {
  const res = await fetch("/api/auth/login", jsonInit("POST", { email, password, rememberMe }));
  const body = await parse<{ user: AppUser }>(res);
  return body.user;
}

export async function apiLogout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

export async function apiMe(): Promise<AppUser> {
  const res = await fetch("/api/auth/me", { method: "GET" });
  return parse<AppUser>(res);
}

// ---- Ayarlar → Profil ----
export async function apiUpdateProfile(
  data: UpdateProfileRequest,
): Promise<AppUser> {
  const res = await fetch("/api/auth/profile", jsonInit("PUT", data));
  return parse<AppUser>(res);
}

export async function apiChangePassword(
  data: ChangePasswordRequest,
): Promise<void> {
  const res = await fetch("/api/auth/password", jsonInit("POST", data));
  await parse<{ ok: boolean }>(res);
}

// ---- Ayarlar → Editör Yönetimi (ADMIN) ----
export async function apiListUsers(): Promise<AdminUserView[]> {
  const res = await fetch("/api/admin/users", { method: "GET" });
  return parse<AdminUserView[]>(res);
}

export async function apiCreateUser(
  data: CreateEditorRequest,
): Promise<AdminUserView> {
  const res = await fetch("/api/admin/users", jsonInit("POST", data));
  return parse<AdminUserView>(res);
}

export async function apiUpdateUserRole(
  id: number,
  role: "EDITOR" | "ADMIN",
): Promise<AdminUserView> {
  const res = await fetch(`/api/admin/users/${id}/role`, jsonInit("PATCH", { role }));
  return parse<AdminUserView>(res);
}

export async function apiUpdateUserEnabled(
  id: number,
  enabled: boolean,
): Promise<AdminUserView> {
  const res = await fetch(
    `/api/admin/users/${id}/enabled`,
    jsonInit("PATCH", { enabled }),
  );
  return parse<AdminUserView>(res);
}

// ---- News ----
export interface NewsListParams {
  status?: string;
  lang?: string;
  category?: string;
  sport?: string;
  q?: string;
  page?: number;
  size?: number;
}

export async function apiListNews(params: NewsListParams): Promise<NewsPageResponse> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.lang) qs.set("lang", params.lang);
  if (params.category) qs.set("category", params.category);
  if (params.sport) qs.set("sport", params.sport);
  if (params.q) qs.set("q", params.q);
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.size !== undefined) qs.set("size", String(params.size));
  const res = await fetch(`/api/news?${qs.toString()}`, { method: "GET" });
  return parse<NewsPageResponse>(res);
}

export async function apiGetNews(id: number): Promise<NewsDetail> {
  const res = await fetch(`/api/news/${id}`, { method: "GET" });
  return parse<NewsDetail>(res);
}

/** Panel dashboard özeti — kartlar + trend + en çok okunan + editör + aktivite. */
export async function apiNewsStats(): Promise<NewsStats> {
  const res = await fetch("/api/news/stats", { method: "GET" });
  return parse<NewsStats>(res);
}

export async function apiCreateNews(data: NewsRequest): Promise<NewsDetail> {
  const res = await fetch("/api/news", jsonInit("POST", data));
  return parse<NewsDetail>(res);
}

/**
 * Bu haberin kaynağından AI özeti üret ve habere işle (EDITOR/ADMIN). Güncel
 * haberi döner. İsteğe bağlı — hepsi için değil, tek haber için elle.
 */
export async function apiAiSummarizeNews(id: number): Promise<NewsDetail> {
  const res = await fetch(`/api/news/${id}/ai-summarize`, { method: "POST" });
  return parse<NewsDetail>(res);
}

export async function apiUpdateNews(id: number, data: NewsRequest): Promise<NewsDetail> {
  const res = await fetch(`/api/news/${id}`, jsonInit("PUT", data));
  return parse<NewsDetail>(res);
}

export async function apiPublishNews(
  id: number,
  opts?: { sendPush?: boolean; pushTarget?: "ALL" | "FAVORITES" },
): Promise<NewsDetail> {
  // sendPush/pushTarget query param olarak backend publish ucuna iletilir.
  // Verilmezse push gönderilmez (liste "Yayınla" aksiyonu bilerek sessiz).
  const qs = new URLSearchParams();
  if (opts?.sendPush) qs.set("sendPush", "true");
  if (opts?.pushTarget) qs.set("pushTarget", opts.pushTarget);
  const url = `/api/news/${id}/publish${qs.toString() ? `?${qs.toString()}` : ""}`;
  const res = await fetch(url, { method: "POST" });
  return parse<NewsDetail>(res);
}

export async function apiUnpublishNews(id: number): Promise<NewsDetail> {
  const res = await fetch(`/api/news/${id}/unpublish`, { method: "POST" });
  return parse<NewsDetail>(res);
}

export async function apiDeleteNews(id: number): Promise<void> {
  const res = await fetch(`/api/news/${id}`, { method: "DELETE" });
  await parse<{ ok: boolean }>(res);
}

/** Toplu işlem — seçili haberlere topluca eylem uygular. */
export async function apiBulkNews(data: BulkNewsRequest): Promise<BulkResult> {
  const res = await fetch("/api/news/bulk", jsonInit("POST", data));
  return parse<BulkResult>(res);
}

/**
 * Haber içe aktarmayı elle tetikle (yalnız ADMIN). Kaynaktan (NewsData) güncel
 * haberleri çeker, yenileri DRAFT olarak açar. Açılan sayıyı döner.
 */
export async function apiIngestNews(): Promise<{ created: number }> {
  const res = await fetch("/api/news/ingest", { method: "POST" });
  return parse<{ created: number }>(res);
}

// ---- Çeviri (DeepL) ----
export async function apiTranslateNews(
  payload: TranslateNewsRequest,
): Promise<TranslateNewsResult> {
  const res = await fetch("/api/news/translate", jsonInit("POST", payload));
  return parse<TranslateNewsResult>(res);
}

/** Çeviri servisi yapılandırılmış mı (DeepL anahtarı var mı)? */
export async function apiTranslateStatus(): Promise<{ enabled: boolean }> {
  const res = await fetch("/api/news/translate/status", { method: "GET" });
  return parse<{ enabled: boolean }>(res);
}

// ---- Image upload ----
export async function apiUploadImage(file: File): Promise<ImageUploadResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/news/images", { method: "POST", body: form });
  return parse<ImageUploadResult>(res);
}

/** Medya kütüphanesi — daha önce yüklenmiş görseller (en yeni üstte). */
export async function apiListMedia(limit = 120): Promise<MediaItem[]> {
  const res = await fetch(`/api/news/media?limit=${limit}`, { method: "GET" });
  return parse<MediaItem[]>(res);
}

/** Bir görselin hangi haber(ler)de kullanıldığı (kapak/gövde). */
export async function apiMediaUsage(key: string): Promise<MediaUsage[]> {
  const res = await fetch(
    `/api/news/media/usage?key=${encodeURIComponent(key)}`,
    { method: "GET" },
  );
  return parse<MediaUsage[]>(res);
}

/** Bir görseli MinIO'dan siler. */
export async function apiDeleteMedia(key: string): Promise<void> {
  const res = await fetch(`/api/news/media?key=${encodeURIComponent(key)}`, {
    method: "DELETE",
  });
  if (res.ok) return;
  let message = "Görsel silinemedi.";
  try {
    const b = await res.json();
    if (b?.message) message = b.message;
  } catch {
    // gövde yok/parse edilemedi
  }
  throw new ApiError(res.status, message);
}

// ---- Broadcast (genel bildirim) ----
export async function apiSendBroadcast(
  data: BroadcastRequest,
): Promise<BroadcastResult> {
  const res = await fetch("/api/notifications/broadcast", jsonInit("POST", data));
  return parse<BroadcastResult>(res);
}

export async function apiListBroadcasts(limit = 50): Promise<BroadcastListItem[]> {
  const res = await fetch(`/api/notifications/broadcast?limit=${limit}`, {
    method: "GET",
  });
  return parse<BroadcastListItem[]>(res);
}

// Yalnızca verilen e-postanın cihazlarına test push (senkron, herkese gitmez).
export async function apiSendTestNotification(
  data: TestNotificationRequest,
): Promise<TestNotificationResult> {
  const res = await fetch("/api/notifications/test", jsonInit("POST", data));
  return parse<TestNotificationResult>(res);
}

// ---- Uygulama İstatistikleri ----
/** Üye/cihaz/oyun KPI'ları — kendi DB'mizden (kesin, gecikmesiz). */
export async function apiAppStats(): Promise<AppStats> {
  const res = await fetch("/api/stats/app", { method: "GET" });
  return parse<AppStats>(res);
}

// ---- Maç-olay bildirim gönderimleri (takip) ----
export async function apiListDeliveries(
  status = "",
  limit = 50,
): Promise<NotificationDelivery[]> {
  const qs = new URLSearchParams();
  if (status) qs.set("status", status);
  qs.set("limit", String(limit));
  const res = await fetch(`/api/notifications/deliveries?${qs.toString()}`, {
    method: "GET",
  });
  return parse<NotificationDelivery[]>(res);
}

export async function apiDeliverySummary(): Promise<NotificationDeliverySummary> {
  const res = await fetch(`/api/notifications/deliveries/summary`, {
    method: "GET",
  });
  return parse<NotificationDeliverySummary>(res);
}

// ---- Search ----
export async function apiSearch(q: string, types: string): Promise<SearchResponse> {
  const qs = new URLSearchParams({ q });
  if (types) qs.set("types", types);
  const res = await fetch(`/api/search?${qs.toString()}`, { method: "GET" });
  return parse<SearchResponse>(res);
}

// ---- Yorum moderasyonu ----
export interface CommentListParams { sport?: string; deleted?: boolean; q?: string; page?: number; size?: number; }
export async function apiListComments(params: CommentListParams): Promise<AdminCommentPage> {
  const qs = new URLSearchParams();
  if (params.sport) qs.set("sport", params.sport);
  if (params.deleted !== undefined) qs.set("deleted", String(params.deleted));
  if (params.q) qs.set("q", params.q);
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.size !== undefined) qs.set("size", String(params.size));
  const res = await fetch(`/api/comments?${qs.toString()}`, { method: "GET" });
  return parse<AdminCommentPage>(res);
}
export async function apiDeleteComment(id: number): Promise<void> {
  const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
  if (!res.ok) await parse<{ ok: boolean }>(res);
}
export async function apiRestoreComment(id: number): Promise<void> {
  const res = await fetch(`/api/comments/${id}/restore`, { method: "POST" });
  if (!res.ok) await parse<{ ok: boolean }>(res);
}

// ---- Denetim günlüğü ----
export async function apiNewsAudit(action: string, page: number, size = 30): Promise<NewsAuditPage> {
  const qs = new URLSearchParams();
  if (action) qs.set("action", action);
  qs.set("page", String(page));
  qs.set("size", String(size));
  const res = await fetch(`/api/news/audit?${qs.toString()}`, { method: "GET" });
  return parse<NewsAuditPage>(res);
}

// ---- Slider küratörlüğü ----
export async function apiGetSlider(lang: string): Promise<NewsListItem[]> {
  const res = await fetch(`/api/news/slider?lang=${encodeURIComponent(lang)}`, { method: "GET" });
  return parse<NewsListItem[]>(res);
}
export async function apiSaveSlider(data: SaveSliderRequest): Promise<NewsListItem[]> {
  const res = await fetch("/api/news/slider", jsonInit("PUT", data));
  return parse<NewsListItem[]>(res);
}

// ---- Hızlı bayrak / yeniden zamanlama / IndexNow ----
export async function apiUpdateFlags(id: number, data: UpdateFlagsRequest): Promise<NewsDetail> {
  const res = await fetch(`/api/news/${id}/flags`, jsonInit("PATCH", data));
  return parse<NewsDetail>(res);
}
export async function apiReschedule(id: number, data: RescheduleRequest): Promise<NewsDetail> {
  const res = await fetch(`/api/news/${id}/schedule`, jsonInit("PATCH", data));
  return parse<NewsDetail>(res);
}
export async function apiIndexNow(id: number): Promise<{ ok: boolean; url: string }> {
  const res = await fetch(`/api/news/${id}/indexnow`, { method: "POST" });
  return parse<{ ok: boolean; url: string }>(res);
}

// ---- İletişim mesajları (ADMIN) ----
export interface ContactListParams { status?: string; page?: number; size?: number; }
export async function apiListContact(params: ContactListParams): Promise<ContactPage> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.page !== undefined) qs.set("page", String(params.page));
  if (params.size !== undefined) qs.set("size", String(params.size));
  const res = await fetch(`/api/contact?${qs.toString()}`, { method: "GET" });
  return parse<ContactPage>(res);
}
export async function apiContactUnreadCount(): Promise<number> {
  const res = await fetch("/api/contact/unread-count", { method: "GET" });
  const body = await parse<{ count: number }>(res);
  return body.count ?? 0;
}
export async function apiUpdateContactStatus(id: number, status: ContactStatus): Promise<ContactMessageView> {
  const res = await fetch(`/api/contact/${id}/status`, jsonInit("PATCH", { status }));
  return parse<ContactMessageView>(res);
}
export async function apiDeleteContact(id: number): Promise<void> {
  const res = await fetch(`/api/contact/${id}`, { method: "DELETE" });
  if (!res.ok) await parse<{ ok: boolean }>(res);
}


// ---- Oyun (Scores Coin) — ADMIN düello yönetimi ----
/** Lig rehberi araması — ad/ülke/ID ile; ID + güncel sezon döner. */
export async function apiSearchLeagues(q: string): Promise<LeagueGuideRow[]> {
  const res = await fetch(`/api/game/leagues?q=${encodeURIComponent(q)}`, {
    method: "GET",
  });
  return parse<LeagueGuideRow[]>(res);
}

export async function apiListCompetitions(): Promise<GameCompetitionItem[]> {
  const res = await fetch("/api/game/competitions", { method: "GET" });
  return parse<GameCompetitionItem[]>(res);
}
export async function apiCreateCompetition(
  data: CreateCompetitionRequest,
): Promise<GameCompetitionItem> {
  const res = await fetch("/api/game/competitions", jsonInit("POST", data));
  return parse<GameCompetitionItem>(res);
}
export async function apiGetCompetition(id: number): Promise<GameCompetitionView> {
  const res = await fetch(`/api/game/competitions/${id}`, { method: "GET" });
  return parse<GameCompetitionView>(res);
}
export async function apiAddDuel(id: number, data: CreateDuelRequest): Promise<void> {
  const res = await fetch(`/api/game/competitions/${id}/duels`, jsonInit("POST", data));
  if (!res.ok) await parse<{ ok: boolean }>(res);
}
export async function apiUpdateCompetitionStatus(
  id: number,
  status: GameStatus,
): Promise<void> {
  const res = await fetch(
    `/api/game/competitions/${id}/status`,
    jsonInit("PATCH", { status }),
  );
  if (!res.ok) await parse<{ ok: boolean }>(res);
}
export async function apiDeleteDuel(duelId: number): Promise<void> {
  const res = await fetch(`/api/game/duels/${duelId}`, { method: "DELETE" });
  if (!res.ok) await parse<{ ok: boolean }>(res);
}
export async function apiDeleteCompetition(id: number): Promise<void> {
  const res = await fetch(`/api/game/competitions/${id}`, { method: "DELETE" });
  if (!res.ok) await parse<{ ok: boolean }>(res);
}


// ---- Oyun: Scores Coin admin yönetimi ----
export async function apiSearchGameUsers(q: string): Promise<AdminUserCoin[]> {
  const res = await fetch(`/api/game/users?q=${encodeURIComponent(q)}`, {
    method: "GET",
  });
  return parse<AdminUserCoin[]>(res);
}
export async function apiGrantCoins(
  userId: number,
  delta: number,
  reason?: string,
): Promise<GrantCoinsResult> {
  const res = await fetch(
    `/api/game/users/${userId}/coins`,
    jsonInit("POST", { delta, reason }),
  );
  return parse<GrantCoinsResult>(res);
}

// ---- Üyeler (admin kullanıcı yönetimi) ----
export async function apiListAppUsers(
  params: AdminAppUserListParams,
): Promise<AdminAppUserPage> {
  const qs = new URLSearchParams();
  if (params.query) qs.set("query", params.query);
  if (params.role) qs.set("role", params.role);
  if (params.enabled) qs.set("enabled", params.enabled);
  if (params.provider) qs.set("provider", params.provider);
  qs.set("page", String(params.page ?? 0));
  qs.set("size", String(params.size ?? 20));
  const res = await fetch(`/api/admin/app-users?${qs.toString()}`);
  return parse<AdminAppUserPage>(res);
}

export async function apiAppUserStats(): Promise<AdminAppUserStats> {
  const res = await fetch("/api/admin/app-users/stats");
  return parse<AdminAppUserStats>(res);
}

export async function apiSetAppUserEnabled(
  id: number,
  enabled: boolean,
): Promise<AdminAppUser> {
  const res = await fetch(`/api/admin/app-users/${id}/enabled`, jsonInit("PATCH", { enabled }));
  return parse<AdminAppUser>(res);
}

export async function apiSetAppUserRole(
  id: number,
  role: "ADMIN" | "EDITOR" | "USER",
): Promise<AdminAppUser> {
  const res = await fetch(`/api/admin/app-users/${id}/role`, jsonInit("PATCH", { role }));
  return parse<AdminAppUser>(res);
}

export async function apiLogoutAllAppUser(
  id: number,
): Promise<{ userId: number; revokedSessions: number }> {
  const res = await fetch(`/api/admin/app-users/${id}/logout-all`, jsonInit("POST"));
  return parse<{ userId: number; revokedSessions: number }>(res);
}

// ---- Muhabir Başvuruları ----
export async function apiListReporterApplications(params: {
  status?: string;
  page?: number;
  size?: number;
}): Promise<AdminReporterApplicationPage> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  qs.set("page", String(params.page ?? 0));
  qs.set("size", String(params.size ?? 20));
  const res = await fetch(`/api/admin/reporter/applications?${qs.toString()}`);
  return parse<AdminReporterApplicationPage>(res);
}

export async function apiApproveReporterApplication(
  id: number,
  note?: string,
): Promise<AdminReporterApplication> {
  const res = await fetch(
    `/api/admin/reporter/applications/${id}/approve`,
    jsonInit("POST", { note: note ?? null }),
  );
  return parse<AdminReporterApplication>(res);
}

export async function apiRejectReporterApplication(
  id: number,
  note?: string,
): Promise<AdminReporterApplication> {
  const res = await fetch(
    `/api/admin/reporter/applications/${id}/reject`,
    jsonInit("POST", { note: note ?? null }),
  );
  return parse<AdminReporterApplication>(res);
}

// ---- TELESKOR — Telepuan Marketi (ayrı servis; BFF /api/teleskor/*) ----
//
// Bu uçlar ScoresTV backend'ine DEĞİL, panelin sunucusu üzerinden Teleskor
// backend'ine gidiyor. Tarayıcı Teleskor'u hiç görmüyor: hizmet hesabının
// kimlik bilgileri yalnız sunucuda (bkz. lib/teleskor.ts).

export async function apiTeleskorProducts(): Promise<TeleskorMarketProduct[]> {
  const res = await fetch("/api/teleskor/market/urunler", { method: "GET" });
  return parse<TeleskorMarketProduct[]>(res);
}

export async function apiTeleskorCreateProduct(
  data: TeleskorMarketProductRequest,
): Promise<TeleskorMarketProduct> {
  const res = await fetch("/api/teleskor/market/urunler", jsonInit("POST", data));
  return parse<TeleskorMarketProduct>(res);
}

/** KISMİ güncelleme: gönderilmeyen alana dokunulmaz. */
export async function apiTeleskorUpdateProduct(
  id: number,
  data: TeleskorMarketProductRequest,
): Promise<TeleskorMarketProduct> {
  const res = await fetch(
    `/api/teleskor/market/urunler/${id}`,
    jsonInit("PUT", data),
  );
  return parse<TeleskorMarketProduct>(res);
}

/** Ürünü vitrinden kaldırır — SİLMEZ (siparişler ona bağlı). */
export async function apiTeleskorDeactivateProduct(id: number): Promise<void> {
  const res = await fetch(`/api/teleskor/market/urunler/${id}`, {
    method: "DELETE",
  });
  await parse<{ ok: boolean }>(res);
}

export async function apiTeleskorOrders(params?: {
  durum?: string;
  kullanici?: string;
  limit?: number;
}): Promise<TeleskorMarketOrder[]> {
  const q = new URLSearchParams();
  if (params?.durum) q.set("durum", params.durum);
  if (params?.kullanici) q.set("kullanici", params.kullanici);
  q.set("limit", String(params?.limit ?? 100));
  const res = await fetch(`/api/teleskor/market/siparisler?${q}`, {
    method: "GET",
  });
  return parse<TeleskorMarketOrder[]>(res);
}

/** İPTAL puanı ve stoğu geri verir — yalnız bir kez. */
export async function apiTeleskorUpdateOrder(
  id: number,
  durum: TeleskorOrderStatus,
  yoneticiNotu?: string,
): Promise<TeleskorMarketOrder> {
  const res = await fetch(
    `/api/teleskor/market/siparisler/${id}`,
    jsonInit("PUT", { durum, yoneticiNotu: yoneticiNotu ?? null }),
  );
  return parse<TeleskorMarketOrder>(res);
}

// ---- TELESKOR — Üye yönetimi ----

export async function apiTeleskorUsers(params?: {
  q?: string;
  status?: string;
  role?: string;
  page?: number;
  size?: number;
}): Promise<TeleskorUserPage> {
  const q = new URLSearchParams();
  if (params?.q) q.set("q", params.q);
  if (params?.status) q.set("status", params.status);
  if (params?.role) q.set("role", params.role);
  q.set("page", String(params?.page ?? 0));
  q.set("size", String(params?.size ?? 20));
  const res = await fetch(`/api/teleskor/users?${q}`, { method: "GET" });
  return parse<TeleskorUserPage>(res);
}

export async function apiTeleskorUser(id: number): Promise<TeleskorUserDetail> {
  const res = await fetch(`/api/teleskor/users/${id}`, { method: "GET" });
  return parse<TeleskorUserDetail>(res);
}

export async function apiTeleskorCreateUser(
  data: TeleskorCreateUserRequest,
): Promise<{ id: number }> {
  const res = await fetch("/api/teleskor/users", jsonInit("POST", data));
  return parse<{ id: number }>(res);
}

export async function apiTeleskorChangeRole(
  id: number,
  role: TeleskorRole,
  reason: string,
): Promise<void> {
  const res = await fetch(
    `/api/teleskor/users/${id}/role`,
    jsonInit("PUT", { role, reason }),
  );
  await parse<{ ok: boolean }>(res);
}

export async function apiTeleskorUserStatus(
  id: number,
  islem: "disable" | "enable" | "revoke-sessions",
  reason: string,
): Promise<void> {
  const res = await fetch(
    `/api/teleskor/users/${id}/status`,
    jsonInit("POST", { islem, reason }),
  );
  await parse<{ ok: boolean }>(res);
}

export async function apiTeleskorPoints(
  id: number,
): Promise<TeleskorPointAccount> {
  const res = await fetch(`/api/teleskor/users/${id}/telepuan`, {
    method: "GET",
  });
  return parse<TeleskorPointAccount>(res);
}

/** Pozitif ekler, negatif düşer. Gerekçe zorunlu (denetim kaydı). */
export async function apiTeleskorAdjustPoints(
  id: number,
  miktar: number,
  aciklama: string,
  reason: string,
): Promise<{ bakiye: number }> {
  const res = await fetch(
    `/api/teleskor/users/${id}/telepuan`,
    jsonInit("POST", { miktar, aciklama, reason }),
  );
  return parse<{ bakiye: number }>(res);
}
