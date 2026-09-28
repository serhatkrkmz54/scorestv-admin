"use client";

import { useState } from "react";
import { apiChangePassword, ApiError } from "@/lib/api-client";
import { gorunenAd, type AppUser } from "@/lib/types";

/**
 * Hesap bölümü — panelin hesabı bir TELESKOR hesabı (28 Eylül 2026).
 *
 * Ad, kullanıcı adı ve e-posta uygulamadaki hesap ekranından düzenleniyor
 * (kullanıcı adı bekleme süresi, e-posta onayı gibi kurallar orada); burada
 * yalnız gösteriliyor. Şifre Teleskor'un kuralıyla burada da değişebilir:
 * değişince Teleskor diğer bütün oturumları (telefondaki uygulama dâhil)
 * kapatır, bu panel oturumu yeni token'la sürer.
 */
export default function ProfileSection({ user }: { user: AppUser }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState<string | null>(null);

  const canChangePassword = user.hasPassword !== false;

  async function changePassword() {
    setPwError(null);
    setPwOk(null);
    if (!currentPassword || !newPassword) {
      setPwError("Tüm şifre alanları zorunludur.");
      return;
    }
    if (newPassword.length < 8) {
      setPwError("Yeni şifre en az 8 karakter olmalı.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Yeni şifreler eşleşmiyor.");
      return;
    }
    setSavingPw(true);
    try {
      await apiChangePassword({
        currentPassword,
        password: newPassword,
        passwordConfirm: confirmPassword,
      });
      setPwOk("Şifren değiştirildi. Diğer cihazlardaki oturumların kapatıldı.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : "Şifre değiştirilemedi.");
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <>
      <div className="card card-pad">
        <div className="section-title">Hesap</div>
        <div className="section-hint">
          Panele TELE SKOR hesabınla giriyorsun. Ad, kullanıcı adı ve e-posta
          uygulamadaki hesap ekranından değiştirilir.
        </div>
        <div className="grid-2">
          <div className="field">
            <label className="label">Görünen ad</label>
            <input className="input" value={gorunenAd(user)} disabled />
          </div>
          <div className="field">
            <label className="label">Kullanıcı adı</label>
            <input className="input" value={user.username ?? ""} disabled />
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label className="label">E-posta</label>
            <input className="input" value={user.email ?? ""} disabled />
          </div>
          <div className="field">
            <label className="label">Rol</label>
            <input className="input" value={user.role === "ADMIN" ? "Yönetici" : user.role} disabled />
          </div>
        </div>
      </div>

      <div className="card card-pad">
        <div className="section-title">Şifre Değiştir</div>
        <div className="section-hint">
          Şifre değişince diğer bütün oturumların (telefondaki uygulama dâhil)
          kapatılır.
        </div>

        {!canChangePassword ? (
          <div className="alert alert-info">
            Bu hesap Google ya da Apple ile açılmış; şifresi yok. Şifre
            uygulamadaki hesap ekranından oluşturulabilir.
          </div>
        ) : (
          <>
            {pwError && <div className="alert alert-error">{pwError}</div>}
            {pwOk && <div className="alert alert-success">{pwOk}</div>}

            <div className="field">
              <label className="label">
                Mevcut Şifre <span className="req">*</span>
              </label>
              <input
                type="password"
                className="input"
                value={currentPassword}
                autoComplete="current-password"
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </div>
            <div className="grid-2">
              <div className="field">
                <label className="label">
                  Yeni Şifre <span className="req">*</span>
                </label>
                <input
                  type="password"
                  className="input"
                  value={newPassword}
                  autoComplete="new-password"
                  maxLength={72}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="field">
                <label className="label">
                  Yeni Şifre (Tekrar) <span className="req">*</span>
                </label>
                <input
                  type="password"
                  className="input"
                  value={confirmPassword}
                  autoComplete="new-password"
                  maxLength={72}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button className="btn btn-primary" onClick={changePassword} disabled={savingPw}>
                {savingPw ? "Değiştiriliyor..." : "Şifreyi Değiştir"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
