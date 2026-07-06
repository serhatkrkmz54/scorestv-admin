"use client";

// Tarayıcı tarafından çağrılan yardımcılar — hepsi kendi BFF rotalarımıza
// gider (backend'e ASLA doğrudan değil). Çerezler otomatik iletilir.

import type {
  AppUser,
  ImageUploadResult,
  NewsDetail,
  NewsPageResponse,
  NewsRequest,
  SearchResponse,
  TranslateNewsRequest,
  TranslateNewsResult,
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

export async function apiCreateNews(data: NewsRequest): Promise<NewsDetail> {
  const res = await fetch("/api/news", jsonInit("POST", data));
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

// ---- Search ----
export async function apiSearch(q: string, types: string): Promise<SearchResponse> {
  const qs = new URLSearchParams({ q });
  if (types) qs.set("types", types);
  const res = await fetch(`/api/search?${qs.toString()}`, { method: "GET" });
  return parse<SearchResponse>(res);
}
