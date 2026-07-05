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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="tr" className={poppins.variable}>
      <body>{children}</body>
    </html>
  );
}
