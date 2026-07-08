import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

// Public site ile aynı yükleme yöntemi: next/font/google Poppins, --font-poppins
// değişkeni. Figma temasındaki "JUST Sans" bu font ile eşlenir. Ağırlıklar 400/
// 500/600/700; display swap.
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "ScoresTV Editör Paneli",
  description: "Haber yönetim paneli — ScoresTV",
  robots: { index: false, follow: false },
};

// Tema flash'ını (FOUC) önle: paint'ten ÖNCE localStorage'daki tercihi okuyup
// <html data-theme> ayarla. Hiçbir şey yoksa panelin mevcut görünümü (açık).
const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem('stv.theme')||'light';var d=t==='dark'||(t==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light';}catch(e){document.documentElement.dataset.theme='light';}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={poppins.variable} suppressHydrationWarning>
      <body>
        {/* Paint'ten önce çalışan tema init'i — FOUC'u önler. body'nin ilk
            çocuğu olarak senkron yürür ve <html data-theme>'i ayarlar. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        {children}
      </body>
    </html>
  );
}
