import React, { useState, useLayoutEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useData } from "../DataContext";
import { FaHome } from "react-icons/fa";

export default function HorsePage() {
  const { horseName } = useParams();
  const { data } = useData();
  const navigate = useNavigate();
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);

  const horses = [...new Set(data.map((d) => d.Horse))].filter(Boolean);
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
      (sum, s) => sum + toFloat(s["Stride length at 60 km/h"]) || 0,
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
      if (mins <= 1)
        return "✅✅ Short burst – anaerobic power, very low risk";
      if (mins <= 2)
        return "✅ Brief anaerobic sprint — expected in finishing work";
      if (mins <= 4)
        return "🎯 Sustained anaerobic — within normal range";
      if (mins <= 6)
        return "🔶 Prolonged anaerobic — monitor recovery";
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
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 8,
        padding: "6px 0",
      }}
    >
      <div style={{ flex: 1, textAlign: "left" }}>{label}</div>
      <div style={{ flex: 1, textAlign: "center", fontWeight: "bold" }}>
        {value}
      </div>
      <div style={{ flex: 1, textAlign: "left", fontStyle: "italic" }}>
        {comment}
      </div>
    </div>
  );

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        backgroundColor: "#0c3050ff",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          backgroundColor: "#0B1E3C",
          padding: "20px 0",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <img
          src="/athleteq-logo-white.png"
          alt="AthletEQ"
          style={{ height: 200 }}
        />
        <FaHome
          onClick={() => navigate("/")}
          style={{
            cursor: "pointer",
            fontSize: "2rem",
            color: "#72B4F6",
          }}
        />
      </div>

      <div
        style={{
          flexGrow: 1,
          overflowY: "auto",
          padding: "40px",
          boxSizing: "border-box",
          width: "100%",
          maxWidth: 1050,
          backgroundColor: "#fff",
          margin: "0 auto",
          borderRadius: "16px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div style={{ width: "100%", maxWidth: 960 }}>
          <h1
            style={{
              fontSize: "2.5rem",
              fontWeight: 900,
              textAlign: "center",
              margin: "20px 0 40px",
              textTransform: "uppercase",
              color: "#0B1E3C",
            }}
          >
            {(horseName || "").toUpperCase()}
          </h1>

          {sessions.length > 1 && (
            <div style={{ textAlign: "center", marginBottom: 30 }}>
              <select
                value={selectedSessionIndex}
                onChange={(e) =>
                  setSelectedSessionIndex(parseInt(e.target.value))
                }
                style={{
                  fontSize: "1.1rem",
                  padding: "10px 20px",
                  borderRadius: 8,
                }}
              >
                {sessions.map((session, index) => (
  <option key={index} value={index}>
    {session.Date} – {session["Training type"]} – {session["Track name"]} – {session["Track condition"]}
  </option>
))}
              </select>
            </div>
          )}
                    <h2 style={{ color: "#0B1E3C" }}>Fitness & Recovery</h2>
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
            comment={getHRAlert(
              latest?.["HR after 5 min in % of max HR"],
              5
            )}
          />
          <Row
            label="HR in % after 10 min"
            value={`${parse(latest?.["HR after 10 min in % of max HR"])}%`}
            comment={getHRAlert(
              latest?.["HR after 10 min in % of max HR"],
              10
            )}
          />
          <Row
            label="HR in % after 15 min (Overall Recovery)"
            value={`${parse(latest?.["HR after 15 min in % of max HR"])}%`}
            comment={getHRAlert(
              latest?.["HR after 15 min in % of max HR"],
              15
            )}
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

          <h2 style={{ color: "#0B1E3C", marginTop: 30 }}>Stride Data</h2>
          <Row
            label="Stride Length at 60 km/h"
            value={parse(latest?.["Stride length at 60 km/h"]) + " m"}
            comment={getStrideAlert()}
          />
          <Row
            label="Stride Frequency at 60 km/h"
            value={parse(latest?.["Stride frequency at 60 km/h"]) + " st/s"}
            comment=""
          />
          <Row
            label="Expected Stride Length at 60 km/h"
            value={getExpectedStride() + " m"}
            comment=""
          />
          <Row
            label="Max Stride Length"
            value={parse(latest?.["Max stride length"]) + " m"}
            comment=""
          />
          <Row
            label="Max Stride Frequency"
            value={parse(latest?.["Max Stride Frequency"]) + " st/s"}
            comment=""
          />

          <h2 style={{ color: "#0B1E3C", marginTop: 30 }}>
            Heart Rate Analysis
          </h2>
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
              comment={getZoneComment(
                zone,
                latest?.[`Duration effort zone ${zone}`]
              )}
            />
          ))}

          <h2 style={{ color: "#0B1E3C", marginTop: 30 }}>Speed Analysis</h2>
          <Row
            label="Top Speed"
            value={parse(latest?.["Max Speed"]) + " km/h"}
            comment={getTopSpeedComment()}
          />

          <h2 style={{ color: "#0B1E3C", marginTop: 30 }}>Sectional Times</h2>
          <Row
            label="Last 800m"
            value={parseTime(latest?.["Time last 800m"])}
            comment=""
          />
          <Row
            label="Last 600m"
            value={parseTime(latest?.["Time last 600m"])}
            comment=""
          />
          <Row
            label="Last 400m"
            value={parseTime(latest?.["Time last 400m"])}
            comment=""
          />
          <Row
            label="Last 200m"
            value={parseTime(latest?.["Time last 200m"])}
            comment=""
          />
          <Row
            label="Best 600m"
            value={parseTime(latest?.["Time best 600m"])}
            comment=""
          />
          <Row
            label="Best 200m"
            value={parseTime(latest?.["Time best 200m"])}
            comment=""
          />
        </div>
      </div>
    </div>
  );
}