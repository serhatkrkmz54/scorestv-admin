"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiUpdateProfile, apiChangePassword, ApiError } from "@/lib/api-client";
import type { AppUser } from "@/lib/types";

/**
 * Profil bölümü (tüm roller). Görünen ad + doğum tarihi + ülke günceller ve
 * şifre değiştirir. Backend'in MEVCUT auth uçlarına (PUT /api/v1/auth/me ve
 * POST /api/v1/auth/change-password) BFF üzerinden bağlanır.
 *
 * NOT: Backend UpdateProfileRequest doğum tarihi + ülkeyi ZORUNLU tutar, bu
 * yüzden bu alanlar da forma dahildir (mevcut değerlerle önden doldurulur).
 */
export default function ProfileSection({ user }: { user: AppUser }) {
  const router = useRouter();

  // ---- Profil formu ----
  const [displayName, setDisplayName] = useState(user.displayName ?? "");
  const [birthDate, setBirthDate] = useState(user.birthDate ?? "");
  const [country, setCountry] = useState(user.country ?? "");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileOk, setProfileOk] = useState<string | null>(null);

  // ---- Şifre formu ----
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwOk, setPwOk] = useState<string | null>(null);

  // Sosyal (Google/Apple) hesaplarda yerel şifre olmayabilir.
  const canChangePassword = user.hasPassword !== false;

  async function saveProfile() {
    setProfileError(null);
    setProfileOk(null);
    if (!displayName.trim()) {
      setProfileError("Görünen ad boş olamaz.");
      return;
    }
    if (!birthDate) {
      setProfileError("Doğum tarihi zorunludur.");
      return;
    }
    if (!country.trim()) {
      setProfileError("Ülke zorunludur.");
      return;
    }
    setSavingProfile(true);
    try {
      await apiUpdateProfile({
        displayName: displayName.trim(),
        birthDate,
        country: country.trim(),
      });
      setProfileOk("Profil güncellendi.");
      // Sidebar/topbar'daki ad anında yenilensin.
      router.refresh();
    } catch (err) {
      setProfileError(
        err instanceof ApiError ? err.message : "Profil güncellenemedi.",
      );
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword() {
    setPwError(null);
    setPwOk(null);
    if (!currentPassword || !newPassword) {
      setPwError("Tüm şifre alanları zorunludur.");
      return;
    }
    if (newPassword.length < 3) {
      setPwError("Yeni şifre en az 3 karakter olmalı.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Yeni şifreler eşleşmiyor.");
      return;
    }
    setSavingPw(true);
    try {
      await apiChangePassword({ currentPassword, newPassword });
      setPwOk("Şifreniz değiştirildi.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPwError(
        err instanceof ApiError ? err.message : "Şifre değiştirilemedi.",
      );
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <>
      <div className="card card-pad">
        <div className="section-title">Profil Bilgileri</div>
        <div className="section-hint">
          Görünen adınız panel genelinde (kenar çubuğu, üst bar) kullanılır.
        </div>

        {profileError && <div className="alert alert-error">{profileError}</div>}
        {profileOk && <div className="alert alert-success">{profileOk}</div>}

        <div className="field">
          <label className="label">E-posta</label>
          <input className="input" value={user.email} disabled />
          <div className="hint">E-posta adresi değiştirilemez.</div>
        </div>

        <div className="field">
          <label className="label">
            Görünen Ad <span className="req">*</span>
          </label>
          <input
            className="input"
            value={displayName}
            maxLength={100}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Adınız Soyadınız"
          />
        </div>

        <div className="grid-2">
          <div className="field">
            <label className="label">
              Doğum Tarihi <span className="req">*</span>
            </label>
            <input
              type="date"
              className="input"
              value={birthDate ?? ""}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label className="label">
              Ülke <span className="req">*</span>
            </label>
            <input
              className="input"
              value={country}
              maxLength={100}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Türkiye"
            />
          </div>
        </div>

        <div className="row" style={{ justifyContent: "flex-end" }}>
          <button
            className="btn btn-primary"
            onClick={saveProfile}
            disabled={savingProfile}
          >
            {savingProfile ? "Kaydediliyor..." : "Profili Kaydet"}
          </button>
        </div>
      </div>

      <div className="card card-pad">
        <div className="section-title">Şifre Değiştir</div>
        <div className="section-hint">
          Güvenlik için şifre değişince diğer tüm oturumlar kapatılır.
        </div>

        {!canChangePassword ? (
          <div className="alert alert-info">
            Bu hesap sosyal giriş (Google/Apple) ile oluşturulmuş; yerel şifresi
            yok ve buradan değiştirilemez.
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
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <div className="row" style={{ justifyContent: "flex-end" }}>
              <button
                className="btn btn-primary"
                onClick={changePassword}
                disabled={savingPw}
              >
                {savingPw ? "Değiştiriliyor..." : "Şifreyi Değiştir"}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
