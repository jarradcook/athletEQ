// src/App.jsx
import React, { useMemo } from "react";
import { Routes, Route, useNavigate, Link } from "react-router-dom";
import { useData } from "./DataContext";
import HorseSelector from "./components/HorseSelector.jsx";
import HorsePage from "./components/HorsePage.jsx";
import AdminUpload from "./components/AdminUpload.jsx";

// Auth
import { auth } from "./firebase";
import { signOut } from "firebase/auth";

function Header() {
  const { claims } = useData();  // 👈 get claims

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        background: "#ffffff",
        color: "#0c3050ff",
        zIndex: 1000,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img src="/athleteq-logo.png" alt="AthletEQ" style={{ height: 36 }} />
        <span style={{ fontWeight: 700, letterSpacing: 0.2 }}>AthletEQ</span>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {/* 👇 Only show if user is admin */}
        {claims?.admin === true && (
          <Link
            to="/admin/upload"
            style={{
              textDecoration: "none",
              background: "transparent",
              color: "#0c3050ff",
              border: "1px solid #0c3050ff",
              padding: "8px 14px",
              borderRadius: 6,
              fontWeight: 600,
            }}
          >
            Admin Upload
          </Link>
        )}
        <button
          onClick={() => signOut(auth)}
          style={{
            background: "#0c3050ff",
            color: "#fff",
            padding: "8px 14px",
            border: "none",
            borderRadius: 6,
            fontWeight: 600,
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0d3557")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0c3050ff")}
        >
          Log out
        </button>
      </div>
    </header>
  );
}

function Home() {
  const { data, ready, claims } = useData(); // 👈 include claims
  const navigate = useNavigate();

  const ninetyDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 90);
    return d;
  }, []);

  const parseDate = (raw) => {
    if (!raw) return null;
    const s = String(raw);
    const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (m) {
      const [_, dd, mm, yyyy] = m;
      const js = new Date(`${yyyy}-${mm}-${dd}`);
      return isNaN(js) ? null : js;
    }
    const d = new Date(s);
    return isNaN(d) ? null : d;
  };

  const recentHorses = useMemo(() => {
    const seen = new Set();
    for (const r of data || []) {
      const topDate = r.date?._seconds
        ? new Date(r.date._seconds * 1000)
        : parseDate(r.Date || r.row?.Date);
      if (!topDate || topDate < ninetyDaysAgo) continue;
      const horse = r.Horse || r.row?.Horse;
      if (horse) seen.add(horse);
    }
    return [...seen].sort();
  }, [data, ninetyDaysAgo]);

  return (
    <div
      style={{
        backgroundColor: "#0c3050ff",
        minHeight: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial, sans-serif",
        padding: 20,
      }}
    >
      <div
        style={{
          backgroundColor: "#fff",
          padding: "40px",
          borderRadius: "16px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
          width: "100%",
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <img
          src="/athleteq-logo.png"
          alt="AthletEQ Logo"
          style={{ width: 280, marginBottom: 4 }}
        />
        {ready && data.length === 0 ? (
          <div style={{ textAlign: "center", color: "#333", marginBottom: 8 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>No sessions yet</div>
            <div>
              Go to <strong>Admin Upload</strong> to add your latest Equimetre export.
            </div>
          </div>
        ) : null}

        <HorseSelector
          horses={recentHorses}
          onSelectHorse={(horse) => navigate(`/horse/${encodeURIComponent(horse)}`)}
        />

        {/* 👇 Only show if admin */}
        {claims?.admin === true && (
          <Link
            to="/admin/upload"
            style={{
              textDecoration: "none",
              backgroundColor: "#11436e",
              color: "#fff",
              padding: "12px 24px",
              fontSize: "1rem",
              borderRadius: "8px",
              border: "none",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              maxWidth: 360,
              marginTop: 8,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0d3557")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#11436e")}
          >
            ⬆️ Admin Upload
          </Link>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div style={{ paddingTop: 64 }}>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/horse/:horseName" element={<HorsePage />} />
        <Route path="/admin/upload" element={<AdminUpload />} />
      </Routes>
    </div>
  );
}