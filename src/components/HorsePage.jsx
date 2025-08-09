import React, { useState, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useData } from "../DataContext";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

export default function HorsePage() {
  const { horseName } = useParams();
  const { data } = useData();
  const navigate = useNavigate();
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);

  const sessions = data.filter(
    (row) =>
      row.Horse?.trim().toLowerCase() === horseName?.trim().toLowerCase()
  );
  const latest = sessions[selectedSessionIndex] || sessions[0];

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [selectedSessionIndex, horseName]);

  const parse = (value) =>
    value === undefined || value === null || value === "" ? "N/A" : value;

  const parseTime = (value) => {
    if (!value || value === "N/A") return "0:00";
    if (typeof value === "string" && value.includes(":")) return value;
    const seconds = parseFloat(value);
    if (isNaN(seconds)) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const toFloat = (val) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? null : parsed;
  };

  const getExpectedStride = () => {
    if (!latest) return "N/A";
    const surface = latest.Surface || latest["Track surface"];
    const past = sessions.filter(
      (s) =>
        (s.Surface || s["Track surface"]) === surface &&
        toFloat(s["Stride length at 60 km/h"])
    );
    const last4 = past.slice(0, 4);
    const total = last4.reduce(
      (sum, s) => sum + (toFloat(s["Stride length at 60 km/h"]) || 0),
      0
    );
    return last4.length ? (total / last4.length).toFixed(2) : "N/A";
  };

  const getStrideAlert = () => {
    const actual = toFloat(latest?.["Stride length at 60 km/h"]);
    const expected = toFloat(getExpectedStride());
    if (!actual || !expected) return null;
    const diff = actual - expected;
    if (diff < -0.45) return "🔴 Severe reduction, possible underperformance";
    if (diff < -0.3) return "🔶 Below expected stride, may need monitoring";
    if (diff > 0.3) return "🟡 Longer stride than usual – possible overreaching";
    return "✅ Stride is within expected range";
  };

  const getRecoveryAlert = () => {
    const fast = toFloat(latest?.["Fast Recovery in % of max HR"]);
    if (fast === null) return null;
    if (fast <= 38) return "✅✅ Low intensity of effort required";
    if (fast <= 45) return "✅ Handled intensity of effort well";
    if (fast <= 55)
      return "🎯 Productive workload, expected effort. Optimal for fitness gains";
    if (fast <= 60) return "🔶 Fair intensity of effort required";
    return "🔴 High intensity of effort felt from training";
  };

  const getHRAlert = (val, minType) => {
    const percent = toFloat(val);
    if (percent === null) return null;

    if (minType === 5) {
      if (percent <= 35) return "✅✅ Excellent early recovery – minimal residual fatigue";
      if (percent <= 42) return "✅ Good early recovery – handled effort well";
      if (percent <= 50) return "🎯 Acceptable recovery for high-intensity work";
      if (percent <= 57) return "🔶 Elevated HR – effort still taxing, monitor recovery";
      return "🔴 High intensity impact – slow recovery from effort";
    }

    if (minType === 10) {
      if (percent <= 32) return "✅✅ Excellent 10 min recovery";
      if (percent <= 38) return "✅ Good recovery";
      if (percent <= 45) return "🎯 Acceptable, continue monitoring";
      if (percent <= 50) return "🔶 Recovery delayed";
      return "🔴 Poor overall recovery pattern";
    }

    if (minType === 15) {
      if (percent <= 35) return "✅✅ Excellent overall recovery";
      if (percent <= 40) return "✅ Good recovery";
      if (percent <= 45) return "🎯 Fair or acceptable recovery";
      if (percent <= 50)
        return "🔶 Slower recovery, continue to monitor workload";
      return "🔴 Poor recovery, horse still in high stress";
    }

    return null;
  };

  const getTime55Quality = () => {
    const val = toFloat(latest?.["Time to 55 % of the max HR "]);
    if (val === null) return null;
    if (val <= 0.5) return "✅✅ Excellent";
    if (val <= 1) return "✅ Good";
    if (val <= 2) return "🎯 Fair";
    return "🔴 Poor";
  };

  const getTime65Quality = () => {
    const val = toFloat(latest?.["Time to 65 % of the max HR "]);
    if (val === null) return null;
    if (val <= 0.5) return "✅✅ Excellent";
    if (val <= 1) return "✅ Good";
    if (val <= 2) return "🎯 Fair";
    return "🔴 Poor";
  };

  const getMaxHRAlert = () => {
    const maxHR = toFloat(latest?.["Max Heart Rate reached during training"]);
    const pastHRs = sessions
      .map((s) => toFloat(s["Max Heart Rate reached during training"]))
      .filter((v) => v !== null);
    if (!maxHR || pastHRs.length < 2) return null;
    const avg = pastHRs.reduce((a, b) => a + b, 0) / pastHRs.length;
    if (Math.abs(maxHR - avg) <= 5) {
      return "✅ Consistent with usual performance";
    }
    return "⚠️ Check HR graph. HR not within expected range";
  };

  const getAcidosisComment = () => {
    const acidose = toFloat(latest?.["Acidose"]);
    if (acidose === null) return null;
    if (acidose <= 10) return "✅✅ Immediate HR drop – excellent lactate clearance";
    if (acidose <= 20) return "✅ Good – normal cardiovascular response post-effort";
    if (acidose <= 30) return "🔶 Delayed drop – monitor fatigue or lactate load";
    return "🔴 Prolonged delay – possible overload or metabolic stress";
  };

  const zoneRanges = {
    1: "50–60%",
    2: "60–70%",
    3: "70–80%",
    4: "80–90%",
    5: "90–100%",
  };

  const getZoneComment = (zone, duration) => {
    const mins = toFloat(duration) / 60;
    switch (zone) {
      case 1:
        return "✅ Recovery zone — aerobic energy use (oxygen-fed, fat burning)";
      case 2:
        return "✅ Aerobic base — low-intensity, long-duration (oxygen-fed)";
      case 3:
        return "🎯 Aerobic threshold — mix of aerobic & anaerobic energy";
      case 4:
        return "🔶 High-intensity threshold — mostly anaerobic (lactate starting to build)";
      case 5:
        if (mins <= 1) return "✅✅ Short burst – anaerobic power, very low risk";
        if (mins <= 2) return "✅ Brief anaerobic sprint — expected in finishing work";
        if (mins <= 4) return "🎯 Sustained anaerobic — within normal range";
        if (mins <= 6) return "🔶 Prolonged anaerobic — monitor recovery";
        return "🔴 Excessive anaerobic load — possible overload or pathology risk";
      default:
        return "";
    }
  };

  const getTopSpeedComment = () => {
    const top = toFloat(latest?.["Max Speed"]);
    const pastSpeeds = sessions
      .map((s) => toFloat(s["Max Speed"]))
      .filter((v) => v !== null);

    if (!top || pastSpeeds.length < 2) return null;

    const sum = pastSpeeds.reduce((a, b) => a + b, 0);
    const avg = sum / pastSpeeds.length;
    const diff = top - avg;

    if (diff > 1.5) return "✅ New top-end effort — strong finishing speed";
    if (diff > 0.5) return "🎯 Good speed shown — slightly above average";
    if (Math.abs(diff) <= 0.5) return `✅ Within expected range (±1.0 km/h)`;
    if (diff < -1.5) return "🔴 Below usual top speed ";
    return "🔶 Slightly below average — monitor next session";
  };

  const Row = ({ label, value, comment }) => (
    <div className="hp-row">
      <div className="hp-row-label">{label}</div>
      <div className="hp-row-value">{value}</div>
      <div className="hp-row-comment">{comment}</div>
    </div>
  );

  // ---------- Fixed white header ----------
  const Header = () => (
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
      <div
        style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}
        onClick={() => navigate("/")}
      >
        <img src="/athleteq-logo.png" alt="AthletEQ" style={{ height: 36 }} />
        <span style={{ fontWeight: 700, letterSpacing: 0.2 }}>AthletEQ</span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => navigate("/")}
          style={{
            background: "transparent",
            color: "#0c3050ff",
            border: "1px solid #0c3050ff",
            padding: "8px 14px",
            borderRadius: 6,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
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

  // ---------- Page layout (order: Title → Sectionals → Fitness → Stride → HR → Speed) ----------
  return (
    <div style={{ paddingTop: 64 }}>
      <Header />

      <div style={{ background: "#0c3050ff", minHeight: "calc(100vh - 64px)", padding: 20 }}>
        <div className="hp-container">
          {/* Title + sessions dropdown centered */}
          <div className="hp-card" style={{ marginBottom: 16, textAlign: "center" }}>
            <h1
              style={{
                fontSize: "2rem",
                fontWeight: 900,
                margin: "8px 0 12px",
                textTransform: "uppercase",
                color: "#0B1E3C",
              }}
            >
              {(horseName || "").toUpperCase()}
            </h1>

            {sessions.length > 1 && (
              <select
                className="hp-select"
                value={selectedSessionIndex}
                onChange={(e) => setSelectedSessionIndex(parseInt(e.target.value))}
                style={{ margin: "0 auto" }}
              >
                {sessions.map((session, index) => (
                  <option key={index} value={index}>
                    {session.Date} – {session["Training type"]} – {session["Track name"]} – {session["Track condition"]}
                  </option>
                ))}
              </select>
            )}

            <div style={{ marginTop: 8, fontWeight: 600, color: "#0B1E3C" }}>
              {sessions.length} session{sessions.length === 1 ? "" : "s"} found
            </div>
          </div>

          {/*{/* Sectional Times — full-width card with non-bold values */}
<h2 className="hp-section-title">Sectional Times</h2>
<div className="hp-grid" style={{ marginBottom: 16 }}>
  <div className="hp-card sectional-card">
    <h3>Last 800m</h3>
    <div className="stat-value">{parseTime(latest?.["Time last 800m"])}</div>
  </div>
  <div className="hp-card sectional-card">
    <h3>Last 600m</h3>
    <div className="stat-value">{parseTime(latest?.["Time last 600m"])}</div>
  </div>
  <div className="hp-card sectional-card">
    <h3>Last 400m</h3>
    <div className="stat-value">{parseTime(latest?.["Time last 400m"])}</div>
  </div>
  <div className="hp-card sectional-card">
    <h3>Last 200m</h3>
    <div className="stat-value">{parseTime(latest?.["Time last 200m"])}</div>
  </div>
  <div className="hp-card sectional-card">
    <h3>Best 600m</h3>
    <div className="stat-value">{parseTime(latest?.["Time best 600m"])}</div>
  </div>
  <div className="hp-card sectional-card">
    <h3>Best 200m</h3>
    <div className="stat-value">{parseTime(latest?.["Time best 200m"])}</div>
  </div>
</div>
          {/* Fitness & Recovery — full-width card */}
          <div className="hp-card" style={{ marginBottom: 16 }}>
            <h3>Fitness & Recovery</h3>
            <Row
              label="Fast Recovery (Intensity of Effort)"
              value={`${parse(latest?.["Fast Recovery in % of max HR"])}%`}
              comment={getRecoveryAlert()}
            />
            <Row
              label="Acidosis (Lactate recovery delay)"
              value={parseTime(latest?.["Acidose"])}
              comment={getAcidosisComment()}
            />
            <Row
              label="HR in % after 5 min"
              value={`${parse(latest?.["HR after 5 min in % of max HR"])}%`}
              comment={getHRAlert(latest?.["HR after 5 min in % of max HR"], 5)}
            />
            <Row
              label="HR in % after 10 min"
              value={`${parse(latest?.["HR after 10 min in % of max HR"])}%`}
              comment={getHRAlert(latest?.["HR after 10 min in % of max HR"], 10)}
            />
            <Row
              label="HR in % after 15 min (Overall Recovery)"
              value={`${parse(latest?.["HR after 15 min in % of max HR"])}%`}
              comment={getHRAlert(latest?.["HR after 15 min in % of max HR"], 15)}
            />
            <Row
              label="Time to 65% Max HR"
              value={parseTime(latest?.["Time to 65 % of the max HR "])}
              comment={getTime65Quality()}
            />
            <Row
              label="Time to 55% Max HR"
              value={parseTime(latest?.["Time to 55 % of the max HR "])}
              comment={getTime55Quality()}
            />
          </div>

          {/* Stride Data — full-width card */}
          <div className="hp-card" style={{ marginBottom: 16 }}>
            <h3>Stride Data</h3>
            <Row
              label="Stride Length at 60 km/h"
              value={`${parse(latest?.["Stride length at 60 km/h"])} m`}
              comment={getStrideAlert()}
            />
            <Row
              label="Stride Frequency at 60 km/h"
              value={`${parse(latest?.["Stride frequency at 60 km/h"])} st/s`}
              comment=""
            />
            <Row
              label="Expected Stride Length @60"
              value={`${getExpectedStride()} m`}
              comment=""
            />
            <Row
              label="Max Stride Length"
              value={`${parse(latest?.["Max stride length"])} m`}
              comment=""
            />
            <Row
              label="Max Stride Frequency"
              value={`${parse(latest?.["Max Stride Frequency"])} st/s`}
              comment=""
            />
          </div>

          {/* Heart Rate Analysis — full-width card */}
          <div className="hp-card" style={{ marginBottom: 16 }}>
            <h3>Heart Rate Analysis</h3>
            <Row
              label="Max HR"
              value={`${parse(latest?.["Max Heart Rate reached during training"])} bpm`}
              comment={getMaxHRAlert()}
            />
            {[1, 2, 3, 4, 5].map((zone) => (
              <Row
                key={`zone-${zone}`}
                label={`Zone ${zone} Duration (${zoneRanges[zone]})`}
                value={parseTime(latest?.[`Duration effort zone ${zone}`])}
                comment={getZoneComment(zone, latest?.[`Duration effort zone ${zone}`])}
              />
            ))}
          </div>

          {/* Speed Analysis — full-width card */}
          <div className="hp-card" style={{ marginBottom: 8 }}>
            <h3>Speed Analysis</h3>
            <Row
              label="Top Speed"
              value={`${parse(latest?.["Max Speed"])} km/h`}
              comment={getTopSpeedComment()}
            />
          </div>
        </div>
      </div>
    </div>
  );
}