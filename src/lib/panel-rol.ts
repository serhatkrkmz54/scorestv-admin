import type { Role } from "./types";

/**
 * Panel rolleri ve SEO rolünün görebildiği sayfalar (3 Ekim).
 *
 * <p>SEO hesabı (arama motoru danışmanı) panele girer ama yalnız Site
 * Haritası ekranını ve kendi hesap ayarını görür. Asıl yetki Teleskor'da:
 * SEO rolü yalnız `/api/v1/admin/site-haritasi` uçlarına girebilir, öbür
 * bütün yönetim uçları ADMIN ister. Buradaki liste, danışmanın 403 dolu
 * sayfalar görmemesi için.
 */
export const PANEL_ROLLERI: readonly Role[] = ["ADMIN", "SEO"];

/**
 * Middleware'in sayfa isteğine yazdığı yol başlığı: layout yolu başka türlü
 * bilemiyor. Tarayıcının yolladığı aynı adlı başlık her sayfa isteğinde ezilir.
 */
export const YOL_BASLIGI = "x-panel-yol";

/** SEO rolünün açılış sayfası. */
export const SEO_ACILIS = "/teleskor/site-haritasi";

const SEO_YOLLARI = [SEO_ACILIS, "/settings"];

/** Bu rol bu sayfayı görebilir mi? (ADMIN her yeri.) */
export function sayfaIzinli(role: Role, yol: string): boolean {
  if (role === "ADMIN") return true;
  if (role === "SEO") return SEO_YOLLARI.some((y) => yol === y || yol.startsWith(y + "/"));
  return false;
}

/** Rolün Türkçe adı (kenar çubuğu, üst çubuk). */
export const ROL_ADI: Record<string, string> = {
  ADMIN: "Yönetici",
  SEO: "SEO danışmanı",
  EDITOR: "Editör",
  USER: "Kullanıcı",
};
