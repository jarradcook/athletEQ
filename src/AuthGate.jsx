import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";

const ALLOWED = [
  // "you@example.com",
];

export default function AuthGate({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ email: "", password: "" });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u && (ALLOWED.length === 0 || ALLOWED.includes(u.email || ""))) {
        setUser(u);
      } else {
        if (u) signOut(auth);
        setUser(null);
      }
      setChecking(false);
    });
    return () => unsub();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth, form.email, form.password);
    } catch {
      setError("Login failed. Check your email and password.");
    }
  };

  if (checking) {
    return (
      <div className="selector-page">
        <div className="selector-card" style={{ color: "#333" }}>Loading…</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="selector-page">
        <form className="selector-card" onSubmit={handleLogin}>
          <img src="/athleteq-logo.png" alt="AthletEQ Logo" style={{ width: 280 }} />
          <h3 style={{ margin: 0, color: "#222" }}>Sign in</h3>

          <input
            className="login-input"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            className="login-input"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />

          {error && <div style={{ color: "red", maxWidth: 360 }}>{error}</div>}

          <button className="login-button" type="submit">
            Sign in
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}