"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to sign in.");
      router.replace("/dashboard"); router.refresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to sign in."); }
    finally { setBusy(false); }
  }

  return (
    <main className="auth-shell">
      <style>{`.auth-shell{min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 15% 10%,rgba(255,214,10,.14),transparent 28%),linear-gradient(135deg,#f4f7fa,#e7eef4)}.auth-card{width:min(430px,100%);background:#fff;border:1px solid var(--line);border-radius:18px;padding:34px;box-shadow:0 24px 60px rgba(0,53,102,.13)}.auth-mark{margin-bottom:22px}.auth-card h1{margin:0;color:var(--regal-navy);font-size:2rem;letter-spacing:-.045em}.auth-copy{margin:7px 0 25px;color:var(--muted);font-size:.78rem}.auth-form{display:grid;gap:14px}.auth-form label{display:grid;gap:6px;color:var(--regal-navy);font-size:.67rem;font-weight:850}.auth-form input{width:100%;border:1px solid #cddbe5;background:#fbfdfe;border-radius:8px;padding:11px 12px;color:var(--ink);font:inherit;font-size:.75rem;outline:none}.auth-form input:focus{border-color:var(--baltic-blue);box-shadow:0 0 0 3px rgba(60,105,151,.1)}.auth-form .primary-button{border:0;cursor:pointer;padding:12px 14px}.auth-form .primary-button:disabled{opacity:.55;cursor:not-allowed}.auth-error{margin:0;padding:10px 12px;border-radius:8px;background:#fff0f0;border:1px solid #f0cccc;color:#a33d3d;font-size:.66rem;font-weight:800}`}</style>
      <section className="auth-card">
        <div className="brand-mark auth-mark">VSI</div>
        <p className="eyebrow dark">VSI IMS</p>
        <h1>Sign in</h1>
        <p className="auth-copy">Access the Information Management System.</p>
        <form onSubmit={submit} className="auth-form">
          <label>Email<input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
          <label>Password<input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        </form>
      </section>
    </main>
  );
}
