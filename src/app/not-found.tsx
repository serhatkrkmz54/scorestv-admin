import Link from "next/link";

export default function NotFound() {
  return (
    <div className="login-shell">
      <div className="login-card" style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 40, margin: "0 0 8px" }}>404</h1>
        <p className="muted mb-3">Aradığınız sayfa bulunamadı.</p>
        <Link href="/" className="btn btn-primary" style={{ width: "100%" }}>
          Panele Dön
        </Link>
      </div>
    </div>
  );
}
