"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Newspaper,
  Megaphone,
  Sparkles,
  Settings,
  ScrollText,
  ShoppingBag,
  ArrowLeftRight,
  UserCog,
  ClipboardList,
  Shirt,
  Languages,
  LifeBuoy,
  ShieldAlert,
  MessagesSquare,
  Activity,
  FileSignature,
  Cpu,
  PackageCheck,
  Users,
  Star,
  Video,
  SlidersHorizontal,
  Map as HaritaIkonu,
  LogOut,
  ChevronDown,
  X,
  type LucideIcon,
} from "lucide-react";
import { useMobilMenu } from "@/components/MobilMenu";
import { apiLogout } from "@/lib/api-client";
import { gorunenAd, type AppUser, type Role } from "@/lib/types";
import { ROL_ADI, sayfaIzinli } from "@/lib/panel-rol";

type SectionId = "genel" | "icerik" | "spor" | "uyeler" | "telepuan" | "seo" | "sistem";

/** Akordiyon açık/kapalı durumunun localStorage anahtarı.
 * v4 (28 Eylül): panel yalnız Teleskor'un; bölümler baştan kuruldu. */
const NAV_OPEN_KEY = "tsk-panel-nav-open-v4";

const DEFAULT_OPEN: Record<SectionId, boolean> = {
  genel: true,
  icerik: true,
  spor: true,
  uyeler: false,
  telepuan: false,
  seo: false,
  sistem: false,
};

interface Baglanti {
  href: string;
  ad: string;
  ikon: LucideIcon;
  /** Aktiflik öneki (varsayılan href); alt adresi başka bağlantının olanlar için. */
  onek?: string;
  haric?: string;
}

/** MENÜ — tek liste; aktif bölüm ve bağlantılar buradan. */
const MENU: { id: SectionId; baslik: string; baglantilar: Baglanti[] }[] = [
  {
    id: "genel",
    baslik: "Genel",
    baglantilar: [{ href: "/teleskor/saglik", ad: "Sistem Sağlığı", ikon: Activity }],
  },
  {
    id: "icerik",
    baslik: "İçerik",
    baglantilar: [
      { href: "/teleskor/haber", ad: "Haberler", ikon: Newspaper },
      { href: "/teleskor/duyuru", ad: "Duyurular", ikon: Megaphone },
      { href: "/teleskor/surum-notu", ad: "Sürüm Notları", ikon: Sparkles },
      { href: "/teleskor/mac-ozeti", ad: "Maç Özeti", ikon: Video },
    ],
  },
  {
    id: "spor",
    baslik: "Spor verisi",
    baglantilar: [
      { href: "/teleskor/one-cikan-ligler", ad: "Öne Çıkan Ligler", ikon: Star },
      { href: "/teleskor/kadro", ad: "Kadro Masası", ikon: Shirt },
      { href: "/teleskor/veri", ad: "Veri Düzeltme", ikon: ClipboardList },
      { href: "/teleskor/ceviri", ad: "Çeviri Düzeltme", ikon: Languages },
    ],
  },
  {
    id: "uyeler",
    baslik: "Üyeler ve topluluk",
    baglantilar: [
      { href: "/teleskor/uyeler", ad: "Üyeler", ikon: UserCog },
      { href: "/teleskor/kitle", ad: "Kitle", ikon: Users },
      { href: "/teleskor/destek", ad: "Destek", ikon: LifeBuoy },
      { href: "/teleskor/sohbet", ad: "Sohbet Şikayetleri", ikon: ShieldAlert },
      { href: "/teleskor/akis", ad: "Akış Şikayetleri", ikon: MessagesSquare },
    ],
  },
  {
    id: "telepuan",
    baslik: "Tele Puan",
    baglantilar: [
      {
        href: "/teleskor/market",
        ad: "Telepuan Marketi",
        ikon: ShoppingBag,
        haric: "/teleskor/market/siparisler",
      },
      { href: "/teleskor/market/siparisler", ad: "Market Siparişleri", ikon: PackageCheck },
      { href: "/teleskor/kim-daha-degerli", ad: "Kim Daha Değerli?", ikon: ArrowLeftRight },
    ],
  },
  {
    id: "seo",
    baslik: "Arama motorları",
    baglantilar: [{ href: "/teleskor/site-haritasi", ad: "Site Haritası", ikon: HaritaIkonu }],
  },
  {
    id: "sistem",
    baslik: "Sistem",
    baglantilar: [
      { href: "/teleskor/ayarlar", ad: "Uygulama Ayarları", ikon: SlidersHorizontal },
      { href: "/teleskor/sozlesme", ad: "Sözleşmeler", ikon: FileSignature },
      { href: "/teleskor/denetim", ad: "Denetim Kaydı", ikon: ScrollText },
      { href: "/teleskor/motor", ad: "Motor", ikon: Cpu },
      { href: "/settings", ad: "Panel Ayarları", ikon: Settings },
    ],
  },
];

/** Rolün görebildiği menü (SEO yalnız Site Haritası + Panel Ayarları). */
function rolMenusu(rol: Role) {
  return MENU.map((b) => ({ ...b, baglantilar: b.baglantilar.filter((l) => sayfaIzinli(rol, l.href)) })).filter(
    (b) => b.baglantilar.length > 0,
  );
}

function aktifMi(pathname: string, b: Baglanti): boolean {
  const onek = b.onek ?? b.href;
  if (b.haric && pathname.startsWith(b.haric)) return false;
  return pathname === onek || pathname.startsWith(onek + "/");
}

/** Aktif rotanın hangi bölümde olduğu — o bölüm otomatik açılır. */
function sectionOfPath(pathname: string): SectionId {
  for (const bolum of MENU) {
    if (bolum.baglantilar.some((b) => aktifMi(pathname, b))) return bolum.id;
  }
  return "genel";
}

/** Akordiyon bölümü — başlık tıklanınca içerik açılıp kapanır. */
function NavSection({
  id,
  title,
  open,
  onToggle,
  children,
}: {
  id: SectionId;
  title: string;
  open: boolean;
  onToggle: (id: SectionId) => void;
  children: ReactNode;
}) {
  return (
    <div className="nav-section">
      <button
        type="button"
        className="sidebar-section nav-section-toggle"
        onClick={() => onToggle(id)}
        aria-expanded={open}
        aria-controls={`nav-group-${id}`}
      >
        <span>{title}</span>
        <ChevronDown size={13} className={`nav-section-chev ${open ? "open" : ""}`} />
      </button>
      <div id={`nav-group-${id}`} className={`nav-group ${open ? "" : "closed"}`}>
        <div className="nav-group-inner">{children}</div>
      </div>
    </div>
  );
}

export default function Sidebar({ user }: { user: AppUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<Record<SectionId, boolean>>(DEFAULT_OPEN);
  const menu = useMobilMenu();

  // Kayıtlı akordiyon durumunu yükle (bir kez, mount'ta).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(NAV_OPEN_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Record<SectionId, boolean>>;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage'dan tek seferlik hidrasyon (kasıtlı)
        setOpen({ ...DEFAULT_OPEN, ...saved });
      }
    } catch {
      /* bozuk kayıt — varsayılan kalsın */
    }
  }, []);

  // Aktif sayfanın bölümü her zaman açık kalsın (gezinince kaybolmasın).
  useEffect(() => {
    const active = sectionOfPath(pathname);
    setOpen((o) => (o[active] ? o : { ...o, [active]: true }));
  }, [pathname]);

  function toggle(id: SectionId) {
    setOpen((o) => {
      const next = { ...o, [id]: !o[id] };
      try {
        localStorage.setItem(NAV_OPEN_KEY, JSON.stringify(next));
      } catch {
        /* localStorage yoksa sessiz */
      }
      return next;
    });
  }

  const initials = gorunenAd(user)
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  async function logout() {
    setBusy(true);
    await apiLogout();
    router.replace("/login");
    router.refresh();
  }

  return (
    <aside
      className="sidebar"
      onClick={(e) => {
        // Dar ekranda çekmece: bir bağlantıya dokununca kapanır (aynı sayfa dahil).
        if ((e.target as HTMLElement).closest("a")) menu.kapat();
      }}
    >
      <div className="sidebar-brand">
        <div className="marka">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/logo-light.png" alt="TELE SKOR" />
          <small>Yönetim Paneli</small>
        </div>
        <button className="menu-kapat" onClick={menu.kapat} aria-label="Menüyü kapat" title="Kapat">
          <X size={20} />
        </button>
      </div>

      <nav className="sidebar-nav">
        {rolMenusu(user.role).map((bolum) => (
          <NavSection
            key={bolum.id}
            id={bolum.id}
            title={bolum.baslik}
            open={open[bolum.id]}
            onToggle={toggle}
          >
            {bolum.baglantilar.map((b) => {
              const Ikon = b.ikon;
              return (
                <Link
                  key={b.href}
                  href={b.href}
                  className={`nav-item ${aktifMi(pathname, b) ? "active" : ""}`}
                >
                  <Ikon className="icon" size={22} />
                  {b.ad}
                </Link>
              );
            })}
          </NavSection>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="avatar">{initials}</div>
          <div className="meta">
            <div className="name">{gorunenAd(user)}</div>
            <div className="role">{ROL_ADI[user.role] ?? user.role}</div>
          </div>
        </div>
        <button className="sidebar-logout" onClick={logout} disabled={busy}>
          <LogOut size={16} />
          {busy ? "Çıkılıyor..." : "Çıkış"}
        </button>
      </div>
    </aside>
  );
}
