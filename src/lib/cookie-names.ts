// Çerez isimleri — hem middleware (Edge) hem sunucu kodu import edebilsin diye
// "server-only" içermeyen ayrı bir modül. Panel kendi isim uzayını kullanır
// (28 Eylül: ScoresTV panelinin stv_admin_* adları Teleskor'a taşınınca
// değişti; eski çerezler zaten başka alan adındaydı).
export const ACCESS_COOKIE = "tsk_panel_at";
export const REFRESH_COOKIE = "tsk_panel_rt";
// Erişim kapısı (PIN/anahtar) çerezi — opak token; middleware doğrular.
export const GATE_COOKIE = "tsk_panel_gate";
