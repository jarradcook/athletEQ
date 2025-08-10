import React from "react";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { useData } from "./DataContext";
import SplashScreen from "./SplashScreen.jsx";
import HorseSelector from "./components/HorseSelector.jsx";

// Auth
import { auth } from "./firebase";
import { signOut } from "firebase/auth";

/* =========================
   Helpers: parsing/cleaning
   ========================= */

// time strings -> seconds (float)
function timeToSeconds(val) {
  if (val == null) return null;
  if (typeof val === "number") return val;
  const s = String(val).trim();
  if (!s) return null;
  if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const parts = s.split(":").map((p) => p.trim());
  const fix = (x) => parseFloat(String(x).replace(",", "."));
  if (parts.length === 3) {
    const [hh, mm, ss] = parts;
    const fss = fix(ss);
    if (isNaN(fss)) return null;
    return Number(hh) * 3600 + Number(mm) * 60 + fss;
  }
  if (parts.length === 2) {
    const [mm, ss] = parts;
    const fss = fix(ss);
    if (isNaN(fss)) return null;
    return Number(mm) * 60 + fss;
  }
  return null;
}

function toNumber(val) {
  if (val == null || val === "") return null;
  if (typeof val === "number") return val;
  const s = String(val).replace("%", "").replace(",", ".").trim();
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function normalizeHeader(h) {
  if (!h) return h;
  return String(h).replace(/\s+/g, " ").trim();
}

// canonical names (stable keys)
const CANONICAL = {
  "Fast Recovery in % of max HR": "Fast Recovery % MaxHR",
  "HR after 15 min in % of max HR": "HR15_pct",
  "HR after 10 min in % of max HR": "HR10_pct",
  "HR after 5 min in % of max HR": "HR5_pct",

  "Max Speed": "Max Speed",
  "Time last 800m": "Time last 800m",
  "Time last 600m": "Time last 600m",
  "Time last 400m": "Time last 400m",
  "Time last 200m": "Time last 200m",
  "Time best 600m": "Time best 600m",
  "Time best 200m": "Time best 200m",

  "Time to 65 % of the max HR": "Time to 65 % of the max HR",
  "Time to 65 % of the max HR ": "Time to 65 % of the max HR",
  "Time to 55 % of the max HR": "Time to 55 % of the max HR",
  "Time to 55 % of the max HR ": "Time to 55 % of the max HR",

  // zone durations (seconds)
  "Duration effort zone 1": "Duration effort zone 1",
  "Duration effort zone 2": "Duration effort zone 2",
  "Duration effort zone 3": "Duration effort zone 3",
  "Duration effort zone 4": "Duration effort zone 4",
  "Duration effort zone 5": "Duration effort zone 5",

  // zone distances (meters) – straight from Equimetre
  "Distance effort zone 1": "Distance effort zone 1",
  "Distance effort zone 2": "Distance effort zone 2",
  "Distance effort zone 3": "Distance effort zone 3",
  "Distance effort zone 4": "Distance effort zone 4",
  "Distance effort zone 5": "Distance effort zone 5",

  // distances
  "Gallop distance": "Gallop distance",
  "Distance of the main work up to the finish line": "Distance of the main work up to the finish line",

  Acidose: "Acidose",
  "Working Duration": "Working Duration",
  "Highest measured acceleration": "Highest measured acceleration",
  "Heart rate after 1 min": "Heart rate after 1 min",
  "Heart rate after 3 min": "Heart rate after 3 min",

  "Training type": "Training type",
  "Track condition": "Track condition",
  "Track name": "Track name",
  Date: "Date",
  Horse: "Horse",
};

// robust aliasing (lowercased comparison)
function cleanHeaders(headers) {
  const lc = (h) => String(h).toLowerCase().replace(/\s+/g, " ").trim();
  const LOOSE = new Map([
    // Fast/Rapid recovery variants
    ["fast recovery in % of max hr", "Fast Recovery % MaxHR"],
    ["fast recovery % maxhr", "Fast Recovery % MaxHR"],
    ["fast recovery % of max hr", "Fast Recovery % MaxHR"],
    ["fast recovery %", "Fast Recovery % MaxHR"],
    ["fast recovery (intensity of effort)", "Fast Recovery % MaxHR"],
    ["rapid recovery in % of max hr", "Fast Recovery % MaxHR"],
    ["rapid recovery % of max hr", "Fast Recovery % MaxHR"],
    ["rapid recovery %", "Fast Recovery % MaxHR"],

    // HR% after 15/10/5 min
    ["hr after 15 min in % of max hr", "HR15_pct"],
    ["hr in % after 15 min", "HR15_pct"],
    ["hr after 10 min in % of max hr", "HR10_pct"],
    ["hr in % after 10 min", "HR10_pct"],
    ["hr after 5 min in % of max hr", "HR5_pct"],
    ["hr in % after 5 min", "HR5_pct"],

    // Last / Best sectionals
    ["time last 800m", "Time last 800m"],
    ["time last 600m", "Time last 600m"],
    ["time last 400m", "Time last 400m"],
    ["time last 200m", "Time last 200m"],
    ["time last 800 m", "Time last 800m"],
    ["time last 600 m", "Time last 600m"],
    ["time last 400 m", "Time last 400m"],
    ["time last 200 m", "Time last 200m"],
    ["best time 600m", "Time best 600m"],
    ["best time 200m", "Time best 200m"],
    ["time best 600m", "Time best 600m"],
    ["time best 200m", "Time best 200m"],
    ["best 600m", "Time best 600m"],
    ["best 200m", "Time best 200m"],

    // Times to % HR
    ["time to 65 % of the max hr", "Time to 65 % of the max HR"],
    ["time to 55 % of the max hr", "Time to 55 % of the max HR"],

    // Zone durations & distances
    ["duration effort zone 1", "Duration effort zone 1"],
    ["duration effort zone 2", "Duration effort zone 2"],
    ["duration effort zone 3", "Duration effort zone 3"],
    ["duration effort zone 4", "Duration effort zone 4"],
    ["duration effort zone 5", "Duration effort zone 5"],

    ["distance effort zone 1", "Distance effort zone 1"],
    ["distance effort zone 2", "Distance effort zone 2"],
    ["distance effort zone 3", "Distance effort zone 3"],
    ["distance effort zone 4", "Distance effort zone 4"],
    ["distance effort zone 5", "Distance effort zone 5"],

    // Distances (named)
    ["gallop distance", "Gallop distance"],
    ["distance of the main work up to the finish line", "Distance of the main work up to the finish line"],

    // Misc
    ["acidose", "Acidose"],
    ["working duration", "Working Duration"],
    ["max speed", "Max Speed"],
    ["highest measured acceleration", "Highest measured acceleration"],
    ["heart rate after 1 min", "Heart rate after 1 min"],
    ["heart rate after 3 min", "Heart rate after 3 min"],
    ["training type", "Training type"],
    ["track condition", "Track condition"],
    ["track name", "Track name"],
    ["date", "Date"],
    ["horse", "Horse"],
  ]);

  return headers.map((h) => {
    const loose = LOOSE.get(lc(h));
    if (loose) return loose;
    const norm = normalizeHeader(h);
    return CANONICAL[norm] ?? norm;
  });
}

// time columns stored as seconds internally
const TIME_COLUMNS = new Set([
  "Time last 800m",
  "Time last 600m",
  "Time last 400m",
  "Time last 200m",
  "Time best 600m",
  "Time best 200m",
  "Time to 65 % of the max HR",
  "Time to 55 % of the max HR",
  // zone durations
  "Duration effort zone 1",
  "Duration effort zone 2",
  "Duration effort zone 3",
  "Duration effort zone 4",
  "Duration effort zone 5",
  "Acidose",
  "Working Duration",
]);

// numeric columns (meters, bpm, % …)
const NUM_COLUMNS = new Set([
  "Fast Recovery % MaxHR",
  "HR15_pct",
  "HR10_pct",
  "HR5_pct",
  "Max Speed",
  "Highest measured acceleration",
  "Heart rate after 1 min",
  "Heart rate after 3 min",

  "Distance effort zone 1",
  "Distance effort zone 2",
  "Distance effort zone 3",
  "Distance effort zone 4",
  "Distance effort zone 5",

  "Gallop distance",
  "Distance of the main work up to the finish line",
]);

function cleanRow(row, headers) {
  const cleaned = {};
  headers.forEach((h) => {
    const v = row[h];
    if (TIME_COLUMNS.has(h)) {
      cleaned[h] = timeToSeconds(v);
    } else if (NUM_COLUMNS.has(h)) {
      cleaned[h] = toNumber(v);
    } else if (typeof v === "string" && v.match(/^ *-?\d+([.,]\d+)? *%?$/)) {
      cleaned[h] = toNumber(v);
    } else {
      cleaned[h] = v ?? null;
    }
  });
  return cleaned;
}

/* =========================
   Helpers: math/util
   ========================= */
const median = (arr) => {
  const nums = arr.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!nums.length) return null;
  const k = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[k] : (nums[k - 1] + nums[k]) / 2;
};
function percentile(arr, p) {
  const a = arr.filter((v) => Number.isFinite(v)).sort((x, y) => x - y);
  if (!a.length) return null;
  const idx = (a.length - 1) * p;
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return a[lo];
  const w = idx - lo;
  return a[lo] * (1 - w) + a[hi] * w;
}
function rnorm(value, p10, p90, invert = false) {
  if (!Number.isFinite(value) || !Number.isFinite(p10) || !Number.isFinite(p90)) return null;
  if (p90 <= p10) return 0.5;
  let x = (value - p10) / (p90 - p10);
  x = Math.max(0, Math.min(1, x));
  return invert ? 1 - x : x;
}

function groupBy(rows, keyFn) {
  const m = new Map();
  rows.forEach((r) => {
    const k = keyFn(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  });
  return m;
}

/* =========================
   Scoring: going‑aware, horse‑relative
   ========================= */

function goingBucket(s) {
  const t = String(s || "").toLowerCase();
  if (t.includes("heavy") || t.includes("soft") || t.includes("sloppy") || t.includes("yield")) return "slow";
  if (t.includes("good")) return "good";
  if (t.includes("firm") || t.includes("fast")) return "firm";
  return "other";
}
function intensityBucket(r) {
  const z5 = parseFloat(r["Duration effort zone 5"]);
  const top = parseFloat(r["Max Speed"]);
  const bZ5 = !Number.isFinite(z5) ? "na" : z5 <= 0 ? "z0" : z5 <= 60 ? "z1" : z5 <= 180 ? "z2" : "z3";
  const bTop = !Number.isFinite(top) ? "natop" : top < 55 ? "t1" : top < 60 ? "t2" : "t3";
  return `${bZ5}|${bTop}`;
}
function horsePoolSameGoing(rows, ref) {
  const horse = ref["Horse"] || "";
  const going = goingBucket(ref["Track condition"]);
  const inten = intensityBucket(ref);
  return rows.filter(
    (s) =>
      s !== ref &&
      (s["Horse"] || "") === horse &&
      goingBucket(s["Track condition"]) === going &&
      intensityBucket(s) === inten
  );
}

function normVsHorse(pool, key, v, invert = false) {
  const arr = pool.map((s) => parseFloat(s[key])).filter(Number.isFinite);
  if (!arr.length || !Number.isFinite(v)) return null;
  const p10 = percentile(arr, 0.10);
  const p90 = percentile(arr, 0.90);
  return rnorm(v, p10, p90, invert);
}

// ratio‑to‑baseline scoring for T65/T55 (horse‑relative, going‑aware)
function relTimeScoreToBaseline(valueSec, baselineSec, going) {
  if (!Number.isFinite(valueSec) || !Number.isFinite(baselineSec) || baselineSec <= 0) return null;
  const ratio = valueSec / baselineSec; // 1.0 == baseline
  // neutral bands by going
  let neutralLo = 0.90, neutralHi = 1.10, mildHi = 1.40;
  if (going === "slow") { // heavy/soft more forgiving
    neutralHi = 1.20;
    mildHi = 1.60;
  }
  if (ratio <= neutralHi && ratio >= neutralLo) return 0.7 + (1 - Math.abs(1 - ratio)) * 0.3; // 0.7..1.0
  if (ratio <= mildHi) {
    // fade from 0.7 down to 0.4 as it approaches mildHi
    const t = (ratio - neutralHi) / (mildHi - neutralHi);
    return 0.7 - t * 0.3;
  }
  // beyond mildHi: 0.1..0.4
  const t2 = Math.min(1, (ratio - mildHi) / (mildHi * 0.5)); // cap
  return 0.4 - t2 * 0.3;
}

export function scoreSessions(rows) {
  if (!Array.isArray(rows) || !rows.length) return [];

  // Build per‑horse+going baselines for T65/T55 & HR15
  const byHorseGoing = groupBy(rows, (r) => `${r.Horse || ""}|${goingBucket(r["Track condition"])}`);
  const baselines = new Map(); // key -> { T65, T55, HR15 }
  for (const [key, grp] of byHorseGoing.entries()) {
    const T65 = median(grp.map((r) => parseFloat(r["Time to 65 % of the max HR"])));
    const T55 = median(grp.map((r) => parseFloat(r["Time to 55 % of the max HR"])));
    const HR15 = median(grp.map((r) => parseFloat(r["HR15_pct"])));
    baselines.set(key, { T65, T55, HR15 });
  }

  const out = rows.map((r) => ({ ...r }));

  for (let i = 0; i < out.length; i++) {
    const r0 = out[i];
    const going = goingBucket(r0["Track condition"]);
    const key = `${r0.Horse || ""}|${going}`;
    const base = baselines.get(key) || {};
    const pool = horsePoolSameGoing(out, r0);

    // ---------- performance vs this horse on same going ----------
    const perfParts = [];
    if (Number.isFinite(r0["Time last 400m"]))
      perfParts.push(normVsHorse(pool, "Time last 400m", r0["Time last 400m"], true));
    if (Number.isFinite(r0["Time best 600m"]))
      perfParts.push(normVsHorse(pool, "Time best 600m", r0["Time best 600m"], true));
    if (Number.isFinite(r0["Time best 200m"]))
      perfParts.push(normVsHorse(pool, "Time best 200m", r0["Time best 200m"], true));
    if (Number.isFinite(r0["Max Speed"]))
      perfParts.push(0.5 * normVsHorse(pool, "Max Speed", r0["Max Speed"], false)); // half‑weight

    const Performance_sameGoing = perfParts.length
      ? Math.max(0, Math.min(1, perfParts.reduce((a, c) => a + (Number.isFinite(c) ? c : 0), 0) / perfParts.length))
      : null;

    // ---------- effort required (with going boost) ----------
    const FR = Number.isFinite(r0["Fast Recovery % MaxHR"]) ? r0["Fast Recovery % MaxHR"] : null;
    // baseline FR mapping: lower % ⇒ lower perceived effort (we invert for an effort score)
    let Effort_required = null;
    if (FR != null) {
      // Normalise FR by going (heavy/soft needs more forgiveness)
      const frMin = going === "slow" ? 40 : 35;
      const frMax = going === "slow" ? 65 : 60;
      let x = (FR - frMin) / (frMax - frMin);
      x = Math.max(0, Math.min(1, x)); // 0..1
      Effort_required = x; // 0 easy .. 1 very hard
    }

    // ---------- recovery (horse‑relative, going‑aware) ----------
    const hr15 = Number.isFinite(r0["HR15_pct"]) ? r0["HR15_pct"] : null;
    const t65 = Number.isFinite(r0["Time to 65 % of the max HR"]) ? r0["Time to 65 % of the max HR"] : null;
    const t55 = Number.isFinite(r0["Time to 55 % of the max HR"]) ? r0["Time to 55 % of the max HR"] : null;

    // HR15 block: normalise within this horse+going
    let scHR15 = null;
    if (hr15 != null && Number.isFinite(base.HR15)) {
      // Lower is better ⇒ invert
      // Use past IQR (10–90) for this horse+going if possible
      const arr = byHorseGoing.get(key)?.map((g) => g["HR15_pct"]).filter(Number.isFinite) || [];
      const p10 = percentile(arr, 0.10) ?? (base.HR15 * 0.9);
      const p90 = percentile(arr, 0.90) ?? (base.HR15 * 1.3);
      scHR15 = rnorm(hr15, p10, p90, true);
    }

    // T65 / T55 relative to baseline (going‑aware tolerance)
    const scT65 = relTimeScoreToBaseline(t65, base.T65, going);
    const scT55 = relTimeScoreToBaseline(t55, base.T55, going);

    // Weights inside recovery: HR15 dominates, especially on slow going
    let wH = 0.55, w65 = 0.25, w55 = 0.20;
    if (going === "slow") {
      wH = 0.65; w65 = 0.20; w55 = 0.15; // heavier HR15 on heavy/soft
    }
    const partsR = [];
    if (scHR15 != null) partsR.push(wH * scHR15);
    if (scT65 != null) partsR.push(w65 * scT65);
    if (scT55 != null) partsR.push(w55 * scT55);
    const Recovery_score = partsR.length ? Math.max(0, Math.min(1, partsR.reduce((a, c) => a + c, 0))) : null;

    // ---------- slow‑going excellence boost ----------
    // If heavy/soft AND HR15 is excellent (<=36%) → give Recovery a small bonus
    if (going === "slow" && Number.isFinite(hr15) && hr15 <= 36 && Recovery_score != null) {
      // adjust internal weighting effect: re‑weight a bit towards recovery
      // (we'll also gently reduce mismatch penalty sensitivity)
    }

    // ---------- mismatch penalty (only when recovery is clearly slow AND perf under horse norm) ----------
    let mismatchPenalty = 0;
    if (Recovery_score != null && Performance_sameGoing != null && Effort_required != null) {
      const perfGap = Performance_sameGoing - Effort_required; // negative = pushed harder than result suggests
      const slowRecovery = Recovery_score < 0.55;
      const gapThreshold = going === "slow" ? -0.35 : -0.25;
      if (perfGap < gapThreshold && slowRecovery) {
        // smaller on slow going
        const factor = going === "slow" ? 0.5 : 0.7;
        mismatchPenalty = Math.min(0.30, (-(perfGap) - Math.abs(gapThreshold)) * factor);
      }
    }

    // ---------- weights across the three blocks ----------
    let wPerf = 0.40, wEff = 0.15, wRec = 0.45;
    if (going === "slow") {
      // heavier on recovery when track is testing
      wRec += 0.10; wPerf -= 0.05; wEff -= 0.05;
    }
    // Normalise
    {
      const sum = wPerf + wEff + wRec;
      wPerf /= sum; wEff /= sum; wRec /= sum;
    }

    // ---------- final score ----------
    let s01;
    if (Recovery_score == null && Performance_sameGoing == null) {
      s01 = 0.5;
    } else {
      const rec = Recovery_score == null ? 0.5 : Recovery_score;
      const per = Performance_sameGoing == null ? 0.5 : Performance_sameGoing;
      const eff = Effort_required == null ? 0.5 : Effort_required; // higher eff isn't "good" or "bad" by itself
      s01 = Math.max(0, Math.min(1, wRec * rec + wPerf * per + wEff * (1 - Math.abs(eff - per)) - mismatchPenalty));
    }
    const Score10 = +(s01 * 9.9).toFixed(1); // never show 10/10

    // ---------- phase & reason ----------
    let Phase, Color, Reason;
    if (Score10 >= 8.5) {
      Phase = "Increase (Exceptional)"; Color = "rgb(0,176,80)";
      Reason = going === "slow"
        ? "Tested conditions handled with excellent recovery and suitable sectionals — workload can be raised."
        : "Excellent recovery and performance relative to this horse’s norm — next workload can be raised.";
    } else if (Score10 >= 7.0) {
      Phase = "Optimal"; Color = "rgb(106,192,121)";
      Reason = "Strong performance with solid recovery — current workload suits.";
    } else if (Score10 >= 5.0) {
      Phase = "Maintenance"; Color = "rgb(255,211,77)";
      Reason = "Steady outcome for this horse and going — no change unless targeting higher intensity.";
    } else if (Score10 >= 3.0) {
      Phase = "Monitor"; Color = "rgb(255,153,51)";
      Reason = "Below the horse’s usual mark for this going — monitor recovery and next session.";
    } else {
      Phase = "Investigate"; Color = "rgb(192,0,0)";
      Reason = "Under par for this horse — check recovery and conditions before next session.";
    }

    out[i] = { ...r0, Score10, Phase, Color, Reason };
  }

  return out;
}

/* =========================
   App component
   ========================= */

export default function App() {
  const { data, setData } = useData();
  const navigate = useNavigate();

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const buf = await file.arrayBuffer();
    const workbook = XLSX.read(buf, { type: "array" });

    const sheetName = workbook.SheetNames.includes("Worksheet")
      ? "Worksheet"
      : workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // 1) headers
    const rowsHeader = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null });
    const rawHeaders = rowsHeader[0] || [];
    const headers = cleanHeaders(rawHeaders);

    // 2) rows with cleaned headers
    const json = XLSX.utils.sheet_to_json(sheet, {
      header: headers,
      range: 1,
      defval: null,
      raw: false,
    });

    // 3) value cleaning
    const cleaned = json.map((r) => cleanRow(r, headers));

    // 3b) small fallbacks for fast recovery + best 600/200 if alternate labels sneak in
    const withFallbacks = cleaned.map((r) => {
      if (r["Fast Recovery % MaxHR"] == null) {
        const key = Object.keys(r).find((k) => {
          const t = k.toLowerCase();
          return (
            t.includes("recovery") &&
            (t.includes("fast") || t.includes("rapid")) &&
            (t.includes("%") || t.includes("percent")) &&
            t.includes("max") &&
            t.includes("hr")
          );
        });
        if (key) {
          const num = toNumber(r[key]);
          if (num != null) r["Fast Recovery % MaxHR"] = num;
        }
      }
      if (r["Time best 600m"] == null) {
        const k600 = Object.keys(r).find((k) => {
          const t = k.toLowerCase();
          return (
            (t.includes("best") || t.includes("record")) &&
            t.includes("600") &&
            (t.includes("time") || t.includes("timing"))
          );
        });
        if (k600) r["Time best 600m"] = timeToSeconds(r[k600]);
      }
      if (r["Time best 200m"] == null) {
        const k200 = Object.keys(r).find((k) => {
          const t = k.toLowerCase();
          return (
            (t.includes("best") || t.includes("record")) &&
            t.includes("200") &&
            (t.includes("time") || t.includes("timing"))
          );
        });
        if (k200) r["Time best 200m"] = timeToSeconds(r[k200]);
      }
      return r;
    });

    // 4) score
    const scored = scoreSessions(withFallbacks);
    setData(scored);
  };

  const clearData = () => {
    if (window.confirm("Are you sure you want to clear all data?")) {
      setData([]);
      navigate("/");
    }
  };

  const now = new Date();
  const ninetyDaysAgo = new Date(now);
  ninetyDaysAgo.setDate(now.getDate() - 90);

  const getRecentHorseNames = (data) => {
    const recentEntries = data.filter((row) => {
      const rawDate = row["Date"] || row["date"] || row["Timestamp"] || row["timestamp"];
      if (!rawDate) return false;
      const normalizedDateStr = String(rawDate).replace(
        /(\d{2})\/(\d{2})\/(\d{4})/,
        "$3-$2-$1"
      );
      const parsedDate = new Date(normalizedDateStr);
      return !isNaN(parsedDate) && parsedDate >= ninetyDaysAgo;
    });
    const horseNames = new Set(recentEntries.map((row) => row.Horse));
    return [...horseNames].sort();
  };

  const recentHorses = getRecentHorseNames(data);

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
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <img src="/athleteq-logo.png" alt="AthletEQ" style={{ height: 36 }} />
        <span style={{ fontWeight: 700, letterSpacing: 0.2 }}>AthletEQ</span>
      </div>
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
    </header>
  );

  const content =
    data.length === 0 ? (
      <SplashScreen onFileUpload={handleFileUpload} />
    ) : (
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
            maxWidth: 480,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <img
            src="/athleteq-logo.png"
            alt="AthletEQ Logo"
            style={{ width: 280, marginBottom: 20 }}
          />
          <HorseSelector
            horses={recentHorses}
            onSelectHorse={(horse) => {
              navigate(`/horse/${encodeURIComponent(horse)}`);
            }}
          />
          <button
            onClick={clearData}
            style={{
              backgroundColor: "#11436e",
              color: "#fff",
              padding: "12px 24px",
              fontSize: "1rem",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontWeight: "bold",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              width: "100%",
              maxWidth: 360,
              marginTop: 20,
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#0d3557")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#11436e")
            }
          >
            🗑️ Clear Data
          </button>
        </div>
      </div>
    );

  return (
    <div style={{ paddingTop: 64 }}>
      <Header />
      {content}
    </div>
  );
}