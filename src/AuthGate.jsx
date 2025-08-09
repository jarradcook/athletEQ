import { useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";

// Optional: restrict to specific emails you added in Firebase
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
      setError("Login failed");
    }
  };

  if (checking) return null;

  if (!user) {
    return (
      <div style={{ display: "grid", placeItems: "center", minHeight: "100vh", background: "#0c2e4e" }}>
        <form onSubmit={handleLogin} style={{ width: 320, padding: 24, borderRadius: 8, background: "white" }}>
          <h3>Sign in</h3>
          <div style={{ margin: "12px 0" }}>
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              style={{ width: "100%", padding: 8 }}
              required
            />
          </div>
          <div style={{ margin: "12px 0" }}>
            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              style={{ width: "100%", padding: 8 }}
              required
            />
          </div>
          {error && <div style={{ color: "red", marginBottom: 8 }}>{error}</div>}
          <button type="submit" style={{ width: "100%", padding: 10 }}>Sign in</button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
}