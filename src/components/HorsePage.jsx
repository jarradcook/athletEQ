// ===== HorsePage.jsx — Stacked score cards + collapsible sections =====
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useData } from "../DataContext";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

export default function HorsePage() {
  const { horseName } = useParams();
  const { data } = useData();
  const navigate = useNavigate();
  const [selectedSessionIndex, setSelectedSessionIndex] = useState(0);

  // -------------------- Feature Toggles --------------------
  const SHOW_CALC_FR_DEBUG = false; // set true to show FR% calibration debug card

  // ---- Calculated FR% tuning ----
  const USE_FR_REGRESSION = true;
  const CAL_FR_BIAS = 0;
  const CAL_FR_MIN = 30;
  const CAL_FR_MAX = 65;
  const REG_MAX_RECENT = 20;
  const REG_MIN_WITH_HR5 = 8;
  const REG_MIN_SCORE_ONLY = 10;

  // ---- Handling Score tuning ----
  const W_HR5 = 0.40, W_HR10 = 0.30, W_HR15 = 0.20, W_FR = 0.10;
  const ALLOW_VHIGH = 6, ALLOW_HIGH = 4, ALLOW_MOD = 2, ALLOW_LOW = 0, ALLOW_TAXING = 2;
  const ACID_BONUS_EXCELLENT = +0.6, ACID_BONUS_GOOD = +0.3, ACID_MALUS_SLOW = -0.3, ACID_MALUS_POOR = -0.6;
  const TREND_STEP = 0.2, TREND_CAP = 0.5;

  // ---- Performance Score cap ----
  const PERF_MAX = 9.5;

  // -------------------- Helpers (spacing-safe) --------------------
  const normCollapseSpaces = (s) => String(s || "")
    .normalize("NFKC")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const normStr = (s) => normCollapseSpaces(s).toLowerCase();

  const toFloat = (val) => {
    if (val === null || val === undefined) return null;
    if (typeof val === "string") {
      const cleaned = normCollapseSpaces(val);
      if (/^\d{1,2}:\d{2}(\.\d+)?$/.test(cleaned)) {
        const [m, rest] = cleaned.split(":");
        const secs = Number(rest);
        const mins = Number(m);
        if (!Number.isFinite(mins) || !Number.isFinite(secs)) return null;
        return mins * 60 + secs;
      }
      const num = parseFloat(cleaned.replace(/,/g, ""));
      return Number.isFinite(num) ? num : null;
    }
    const num = Number(val);
    return Number.isFinite(num) ? num : null;
  };

  // Strict DD/MM/YYYY (or DD-MM-YYYY) with optional HH:MM
  const parseDateLoose = (raw) => {
    if (!raw) return null;
    const s = normCollapseSpaces(raw);
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/);
    if (!m) return null;
    let [, dd, mm, yyyy, hh = "00", min = "00"] = m;
    const year = yyyy.length === 2 ? Number(`20${yyyy}`) : Number(yyyy);
    const day = Number(dd);
    const month = Number(mm) - 1;
    const hour = Number(hh);
    const minute = Number(min);
    const d = new Date(year, month, day, hour, minute);
    if (d.getFullYear() !== year || d.getMonth() !== month || d.getDate() !== day) return null;
    return d;
  };

  const parse = (value) =>
    value === undefined || value === null || value === "" ? "N/A" : value;

  const formatSectional = (value) => {
    if (value == null || value === "" || value === "N/A") return "N/A";
    if (typeof value === "string" && value.includes(":")) return normCollapseSpaces(value);
    const s = toFloat(value);
    if (!Number.isFinite(s)) return "N/A";
    let mins = Math.floor(s / 60);
    let secs = s - mins * 60;
    let rounded = Number(secs.toFixed(1));
    if (rounded >= 60) { mins += 1; rounded = 0; }
    const secsStr = rounded.toFixed(1).padStart(4, "0");
    return `${mins}:${secsStr}`;
  };

  const parseTime = (value) => {
    if (value == null || value === "" || value === "N/A") return "N/A";
    if (typeof value === "string" && value.includes(":")) return normCollapseSpaces(value);
    const seconds = toFloat(value);
    if (!Number.isFinite(seconds)) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const fmtMeters = (m) => {
    const n = toFloat(m);
    if (!Number.isFinite(n)) return "N/A";
    return Math.round(n).toLocaleString() + " m";
  };

  const firstVal = (row, keys) => {
    for (const k of keys) {
      const v = row?.[k];
      if (v !== undefined && v !== null && v !== "") return v;
    }
    return undefined;
  };

  const asPct = (v) => (v === undefined ? "N/A" : `${parse(v)}%`);
  const isNum = (v) => typeof v === "number" && Number.isFinite(v);
  const sec = (v) => {
    if (v == null || v === "" || v === "N/A") return null;
    if (typeof v === "string" && v.includes(":")) {
      const s = normCollapseSpaces(v);
      const [m, rest] = s.split(":");
      const mins = Number(m);
      const secs = Number(rest);
      if (!Number.isFinite(mins) || !Number.isFinite(secs)) return null;
      return mins * 60 + secs;
    }
    const n = toFloat(v);
    return Number.isFinite(n) ? n : null;
  };

  // -------------------- Footing helpers --------------------
  const getSurfaceRaw = (row) =>
    firstVal(row, ["Surface", "Track surface", "Track Surface", "surface"]);
  const getConditionRaw = (row) =>
    firstVal(row, ["Track condition", "Going", "Condition", "Ground", "track condition"]);

  const bucketSurface = (s) => {
    const t = normStr(s);
    if (!t) return "unknown";
    if (/sand|dirt/.test(t)) return "sand";
    if (/synthetic|tapeta|poly|all weather|awt|fibresand|cinders/.test(t)) return "synthetic";
    return "grass";
  };

  const bucketGroundState = (s) => {
    const t = normStr(s);
    if (!t) return "unknown";
    if (/heavy/.test(t)) return "heavy";
    if (/good\s*to\s*soft/.test(t)) return "good-soft";
    if (/soft/.test(t)) return "soft";
    if (/good\s*to\s*firm/.test(t)) return "firm";
    if (/\bstandard\b|\bstd\b/.test(t)) return "standard";
    if (/good(?!\s*to\s*soft)/.test(t)) return "good";
    return "unknown";
  };

  const footingKey = (row) => {
    const surf = bucketSurface(getSurfaceRaw(row));
    const state = bucketGroundState(getConditionRaw(row));
    return `${surf}:${state}`;
  };

  // -------------------- Sessions --------------------
  const sessions = useMemo(() => {
    const norm = (s) => normStr(s).replace(/\s+/g, " ");
    const target = norm(horseName);
    const getHorse = (row) =>
      row?.["Horse"] ?? row?.["Horse name"] ?? row?.["Horse Name"] ?? row?.["horse"];
    const list = (data || []).filter((row) => norm(getHorse(row)) === target);

    return [...list].sort((a, b) => {
      const da = parseDateLoose(a?.Date || a?.["Session date"] || a?.["Session Date"] || a?.["date"]);
      const db = parseDateLoose(b?.Date || b?.["Session date"] || b?.["Session Date"] || b?.["date"]);
      if (da && db) return db.getTime() - da.getTime();
      if (da && !db) return -1;
      if (!da && db) return 1;
      return 0;
    });
  }, [data, horseName]);

  const pastSessions = useMemo(
    () => sessions.slice(selectedSessionIndex + 1),
    [sessions, selectedSessionIndex]
  );

  useEffect(() => { setSelectedSessionIndex(0); }, [horseName]);
  useEffect(() => { if (selectedSessionIndex >= sessions.length) setSelectedSessionIndex(0); }, [sessions, selectedSessionIndex]);
  useEffect(() => { window.scrollTo(0, 0); }, [selectedSessionIndex, horseName]);

  const latest = sessions[selectedSessionIndex] || sessions[0];

  const formatDate = (raw) => {
    const d = parseDateLoose(raw);
    return d
      ? new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "2-digit" }).format(d)
      : raw ?? "—";
  };

  // ===== Scoring =====
  const getHR5 = (row) => toFloat(firstVal(row, ["HR after 5 min in % of max HR", "HR5_pct"]));

  const pastAvg = useMemo(() => {
    const arr = (getter) => (pastSessions || []).map(getter).filter((x) => Number.isFinite(x));
    const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
    return {
      top:  avg(arr((s) => toFloat(firstVal(s, ["Max Speed","Top Speed","Maximum speed"])))),
      l600: avg(arr((s) => sec(firstVal(s, ["Time last 600m"])))),
      b600: avg(arr((s) => sec(firstVal(s, ["Time best 600m"])))),
    };
  }, [pastSessions]);

  const getIntensityScore = (row, pastAvgInput) => {
    const topSpeed   = toFloat(firstVal(row, ["Max Speed","Top Speed","Maximum speed"]));
    const distGallop = toFloat(firstVal(row, ["Gallop distance","Distance","Total distance"]));
    const zone5      = toFloat(firstVal(row, ["Duration effort zone 5"]));
    const last600    = sec(firstVal(row, ["Time last 600m"]));
    const best600    = sec(firstVal(row, ["Time best 600m"]));

    const surfBucket   = bucketSurface(getSurfaceRaw(row));
    const groundBucket = bucketGroundState(getConditionRaw(row));
    const surfRaw      = normStr(getSurfaceRaw(row));

    let score = 0;
    const p = pastAvgInput || { top: null, l600: null, b600: null };

    if (Number.isFinite(topSpeed) && Number.isFinite(p.top)) {
      const diff = topSpeed - p.top;
      if (diff >= 2.0) score += 3;
      else if (diff >= 1.0) score += 2;
      else if (diff <= -1.5) score -= 1;
    } else if (Number.isFinite(topSpeed)) {
      if (topSpeed >= 60) score += 3;
      else if (topSpeed >= 58) score += 2;
      else if (topSpeed >= 56) score += 1;
    }

    if (Number.isFinite(last600) && Number.isFinite(p.l600)) {
      const diff = p.l600 - last600; // faster → harder
      if (diff >= 1.5) score += 2;
      else if (diff >= 0.7) score += 1;
    }
    if (Number.isFinite(best600) && Number.isFinite(p.b600)) {
      const diff = p.b600 - best600;
      if (diff >= 1.5) score += 2;
      else if (diff >= 0.7) score += 1;
    }

    if (Number.isFinite(zone5)) {
      if (zone5 >= 240) score += 3;
      else if (zone5 >= 120) score += 2;
      else if (zone5 >= 60)  score += 1;
    }

    if (Number.isFinite(distGallop)) {
      if (distGallop >= 2200) score += 2;
      else if (distGallop >= 1600) score += 1;
    }

    const taxing = surfBucket === "sand" || /deep/.test(surfRaw) || groundBucket === "soft" || groundBucket === "heavy";
    if (taxing) score += 1;

    return score;
  };

  const frCalibration = useMemo(() => {
    if (!latest || !USE_FR_REGRESSION) return null;

    const frActualLatest = toFloat(firstVal(latest, [
      "Fast Recovery in % of max HR","Fast Recovery % MaxHR","Fast Recovery",
    ]));
    if (Number.isFinite(frActualLatest)) return null;

    const latestFooting = footingKey(latest);
    const recentSameFooting = pastSessions
      .filter((s) => footingKey(s) === latestFooting)
      .slice(0, REG_MAX_RECENT);

    if (!recentSameFooting.length) return null;

    const rows = recentSameFooting.map((s) => {
      const fr = toFloat(firstVal(s, [
        "Fast Recovery in % of max HR","Fast Recovery % MaxHR","Fast Recovery",
      ]));
      if (!Number.isFinite(fr)) return null;
      const sc = getIntensityScore(s, pastAvg);
      const h5 = getHR5(s);
      return { fr, sc, h5 };
    }).filter(Boolean);

    const withH5 = rows.filter(r => Number.isFinite(r.sc) && Number.isFinite(r.h5));
    if (withH5.length >= REG_MIN_WITH_HR5) {
      const mean = (a, f) => a.reduce((s, v) => s + f(v), 0) / a.length;
      const mx1 = mean(withH5, r => r.sc);
      const mx2 = mean(withH5, r => r.h5);
      const my  = mean(withH5, r => r.fr);

      let S11 = 0, S22 = 0, S12 = 0, T1 = 0, T2 = 0;
      for (const r of withH5) {
        const x1 = r.sc - mx1;
        const x2 = r.h5 - mx2;
        const y  = r.fr - my;
        S11 += x1 * x1;
        S22 += x2 * x2;
        S12 += x1 * x2;
        T1  += x1 * y;
        T2  += x2 * y;
      }
      const det = S11 * S22 - S12 * S12;
      if (Math.abs(det) > 1e-9) {
        const b1 = (T1 * S22 - T2 * S12) / det;
        const b2 = (S11 * T2 - S12 * T1) / det;
        const alpha = my - b1 * mx1 - b2 * mx2;
        return { kind: "two", alpha, b1, b2, n: withH5.length, footing: latestFooting };
      }
    }

    const withScore = rows.filter(r => Number.isFinite(r.sc));
    if (withScore.length >= REG_MIN_SCORE_ONLY) {
      const n = withScore.length;
      let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
      for (const r of withScore) {
        sumX += r.sc; sumY += r.fr; sumXY += r.sc * r.fr; sumX2 += r.sc * r.sc;
      }
      const denom = n * sumX2 - sumX * sumX;
      if (Math.abs(denom) > 1e-9) {
        const b = (n * sumXY - sumX * sumY) / denom;
        const a = (sumY - b * sumX) / n;
        return { kind: "one", alpha: a, b, n, footing: latestFooting };
      }
    }
    return null;
  }, [latest, pastSessions, pastAvg, USE_FR_REGRESSION]);

  const getEffortLevelDetailed = useMemo(() => {
    return (rowInput) => {
      const row = rowInput || latest;
      if (!row) {
        return { level: "low", source: "calculated", inferredLevel: "low", frLevel: null, frCalcPct: null, calibration: null, score: 0 };
      }

      const fr = toFloat(firstVal(row, [
        "Fast Recovery in % of max HR", "Fast Recovery % MaxHR", "Fast Recovery",
      ]));

      const score = getIntensityScore(row, pastAvg);
      const inferredLevel = score >= 5 ? "very high" : score >= 3 ? "high" : score >= 1 ? "moderate" : "low";
      const frLevel = Number.isFinite(fr)
        ? (fr <= 38 ? "low" : fr <= 45 ? "moderate" : fr <= 55 ? "high" : "very high")
        : null;

      let frCalcPct = null;
      let calibration = null;
      if (!Number.isFinite(fr) && frCalibration) {
        const hr5 = getHR5(row);
        if (frCalibration.kind === "two" && Number.isFinite(hr5)) {
          frCalcPct = frCalibration.alpha + frCalibration.b1 * score + frCalibration.b2 * hr5 + CAL_FR_BIAS;
        } else if (frCalibration.kind === "one") {
          frCalcPct = frCalibration.alpha + frCalibration.b * score + CAL_FR_BIAS;
        }
        if (Number.isFinite(frCalcPct)) {
          frCalcPct = Math.max(CAL_FR_MIN, Math.min(CAL_FR_MAX, frCalcPct));
          calibration = frCalibration;
        } else frCalcPct = null;
      }

      let level, source;
      if (frLevel) { level = frLevel; source = "fr%"; }
      else { level = inferredLevel; source = "calculated"; }

      return { level, source, inferredLevel, frLevel, frCalcPct, calibration, score };
    };
  }, [latest, pastAvg, frCalibration]);

  const getEffortLevel = useMemo(() => (rowInput) => getEffortLevelDetailed(rowInput).level, [getEffortLevelDetailed]);

  const getAllowancePP = (row) => {
    const score = getIntensityScore(row, pastAvg);
    let allow = score >= 5 ? ALLOW_VHIGH : score >= 3 ? ALLOW_HIGH : score >= 1 ? ALLOW_MOD : ALLOW_LOW;
    const surfBucket   = bucketSurface(getSurfaceRaw(row));
    const groundBucket = bucketGroundState(getConditionRaw(row));
    const surfRaw      = normStr(getSurfaceRaw(row));
    const taxing = surfBucket === "sand" || /deep/.test(surfRaw) || groundBucket === "soft" || groundBucket === "heavy";
    if (taxing) allow += ALLOW_TAXING;
    return { allow, score };
  };

  const subscoreHR = (pct, allowancePP) => {
    if (!Number.isFinite(pct)) return null;
    const p = pct - allowancePP;
    if (p <= 35) return 10;
    if (p <= 42) return 8.5;
    if (p <= 50) return 6.5;
    if (p <= 57) return 4.5;
    return Math.max(0, 2 - (p - 60) * 0.1);
  };

  const subscoreFR = (frPct, allowancePP) => {
    if (!Number.isFinite(frPct)) return null;
    const p = frPct - allowancePP;
    if (p <= 38) return 9.5;
    if (p <= 45) return 8.0;
    if (p <= 55) return 6.0;
    if (p <= 60) return 4.0;
    return Math.max(0, 2 - (p - 62) * 0.1);
  };

  const buildComparableSet = (row, selector) => {
    const thisEffort = getEffortLevel(row);
    const thisFooting = footingKey(row);
    const candidates = pastSessions
      .map((s) => ({ row: s, val: selector(s), effort: getEffortLevel(s), footing: footingKey(s) }))
      .filter((x) => Number.isFinite(x.val));
    const both = candidates.filter((x) => thisEffort && x.effort === thisEffort && thisFooting && x.footing === thisFooting);
    if (both.length) return both;
    const effortOnly = candidates.filter((x) => thisEffort && x.effort === thisEffort);
    if (effortOnly.length) return effortOnly;
    const footingOnly = candidates.filter((x) => thisFooting && x.footing === thisFooting);
    if (footingOnly.length) return footingOnly;
    return candidates;
  };

  const handlingSolo = useMemo(() => {
    if (!latest) return null;

    const HR5 = toFloat(firstVal(latest, ["HR after 5 min in % of max HR", "HR5_pct"]));
    const HR10 = toFloat(firstVal(latest, ["HR after 10 min in % of max HR", "HR10_pct"]));
    const HR15 = toFloat(firstVal(latest, ["HR after 15 min in % of max HR", "HR15_pct"]));
    const FRactual = toFloat(firstVal(latest, ["Fast Recovery in % of max HR", "Fast Recovery % MaxHR", "Fast Recovery"]));
    const FRcalc = getEffortLevelDetailed(latest).frCalcPct;
    const FR = Number.isFinite(FRactual) ? FRactual : (Number.isFinite(FRcalc) ? FRcalc : null);
    const Acid = toFloat(latest?.["Acidose"]); // seconds

    // Need at least 3 of HR5/HR10/HR15/FR
    const presentCount = [HR5, HR10, HR15, FR].filter((v) => Number.isFinite(v)).length;
    if (presentCount < 3) return null;

    const { allow } = getAllowancePP(latest);
    const sHR5 = subscoreHR(HR5, allow);
    const sHR10 = subscoreHR(HR10, allow);
    const sHR15 = subscoreHR(HR15, allow);
    const sFR = subscoreFR(FR, allow);

    // Weighted average (renormalized)
    let weights = [], subs = [];
    const pushIf = (val, w) => { if (isNum(val)) { subs.push(val); weights.push(w); } };
    pushIf(sHR5, W_HR5); pushIf(sHR10, W_HR10); pushIf(sHR15, W_HR15); pushIf(sFR, W_FR);
    const wSum = weights.reduce((a,b)=>a+b,0); if (!wSum) return null;
    weights = weights.map((w)=>w/wSum);

    let score0to10 = subs.reduce((s,v,i)=>s+v*weights[i],0);

    // Trend vs similar sessions (effort/footing aware)
    let trendAdj = 0;
    const comparers = [
      { val: HR5,  selector: (s) => toFloat(firstVal(s, ["HR after 5 min in % of max HR", "HR5_pct"])) },
      { val: HR10, selector: (s) => toFloat(firstVal(s, ["HR after 10 min in % of max HR", "HR10_pct"])) },
      { val: HR15, selector: (s) => toFloat(firstVal(s, ["HR after 15 min in % of max HR", "HR15_pct"])) },
      { val: FR,   selector: (s) => toFloat(firstVal(s, ["Fast Recovery in % of max HR","Fast Recovery % MaxHR","Fast Recovery"])) },
    ];
    for (const cmp of comparers) {
      if (!Number.isFinite(cmp.val)) continue;
      const set = buildComparableSet(latest, cmp.selector).slice(0, 8);
      if (!set.length) continue;
      const avg = set.reduce((a, b) => a + b.val, 0) / set.length;
      const diff = cmp.val - avg; // lower is better
      let step;
      if (set.length < 3) step = 0;
      else if (set.length <= 4) step = TREND_STEP/2;
      else step = TREND_STEP;
      if (diff <= -2) trendAdj += step;
      else if (diff >= 2) trendAdj -= step;
    }
    trendAdj = Math.max(-TREND_CAP, Math.min(TREND_CAP, trendAdj));

    // Acidose adjustment (seconds)
    let acidAdj = 0;
    if (Number.isFinite(Acid)) {
      if (Acid <= 25) acidAdj = ACID_BONUS_EXCELLENT;
      else if (Acid <= 35) acidAdj = ACID_BONUS_GOOD;
      else if (Acid <= 45) acidAdj = 0;
      else if (Acid <= 60) acidAdj = ACID_MALUS_SLOW;
      else acidAdj = ACID_MALUS_POOR;
    }

    return Math.max(0, Math.min(9.5, score0to10 + trendAdj + acidAdj));
  }, [latest, pastSessions, pastAvg, frCalibration]);

  const effortDetail = getEffortLevelDetailed(latest);
  const canScoreHandling = useMemo(() => {
    if (!latest) return false;
    const FRactual = firstVal(latest, ["Fast Recovery in % of max HR","Fast Recovery % MaxHR","Fast Recovery"]);
    const FRcalc = effortDetail?.frCalcPct;
    const vals = [
      firstVal(latest, ["HR after 5 min in % of max HR", "HR5_pct"]),
      firstVal(latest, ["HR after 10 min in % of max HR", "HR10_pct"]),
      firstVal(latest, ["HR after 15 min in % of max HR", "HR15_pct"]),
      Number.isFinite(toFloat(FRactual)) ? FRactual : (Number.isFinite(FRcalc) ? FRcalc : null),
    ].map(toFloat).filter(Number.isFinite);
    return vals.length >= 3;
  }, [latest, effortDetail]);

  // ===== Performance helpers =====
  const PERF_MAX_LOCAL = PERF_MAX;
  const getPerformanceScore = (row, pastSessions) => {
    if (!row) return null;
    const toNum = (x) => (Number.isFinite(x) ? x : null);

    const topSpeed   = toNum(toFloat(firstVal(row, ["Max Speed","Top Speed","Maximum speed"])));
    const last400    = toNum(sec(firstVal(row, ["Time last 400m"])));
    const last600    = toNum(sec(firstVal(row, ["Time last 600m"])));
    const best200    = toNum(sec(firstVal(row, ["Time best 200m"])));
    const best600    = toNum(sec(firstVal(row, ["Time best 600m"])));
    const zone4      = toNum(toFloat(firstVal(row, ["Duration effort zone 4"])));
    const zone5      = toNum(toFloat(firstVal(row, ["Duration effort zone 5"])));
    const gallopDist = toNum(toFloat(firstVal(row, ["Gallop distance","Distance","Total distance"])));

    const footing = footingKey(row);
    const sameFooting = (pastSessions || []).filter(s => footingKey(s) === footing);
    const pool = sameFooting.length ? sameFooting : (pastSessions || []);

    const avg = (arr) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null;
    const pastTop = avg(pool.map(s => toFloat(firstVal(s, ["Max Speed","Top Speed","Maximum speed"]))).filter(Number.isFinite));
    const past400 = avg(pool.map(s => sec(firstVal(s, ["Time last 400m"]))).filter(Number.isFinite));
    const past600 = avg(pool.map(s => sec(firstVal(s, ["Time last 600m"]))).filter(Number.isFinite));

    let subs = [];
    if (last400 && past400) { const diff = past400 - last400; subs.push(Math.max(0, Math.min(10, 5 + diff))); }
    if (last600 && past600) { const diff = past600 - last600; subs.push(Math.max(0, Math.min(10, 5 + 0.8*diff))); }
    if (topSpeed && pastTop) { const diff = topSpeed - pastTop; subs.push(Math.max(0, Math.min(10, 5 + diff))); }
    if (best200) { subs.push(best200 <= 11 ? 9 : best200 <= 12 ? 8 : best200 <= 13 ? 6 : 4); }
    if (best600) { subs.push(best600 <= 34 ? 9 : best600 <= 36 ? 8 : best600 <= 38 ? 6 : 4); }
    if (zone4 || zone5) {
      const mins4 = (zone4||0)/60, mins5 = (zone5||0)/60;
      const totalMins = mins4 + mins5*1.5;
      subs.push(totalMins >= 6 ? 9 : totalMins >= 4 ? 8 : totalMins >= 2 ? 6 : 4);
    }
    if (gallopDist) { subs.push(gallopDist >= 2000 ? 9 : gallopDist >= 1600 ? 8 : gallopDist >= 1200 ? 6 : 4); }

    if (!subs.length) return null;
    const avgSub = subs.reduce((a,b)=>a+b,0)/subs.length;
    return Math.min(PERF_MAX_LOCAL, avgSub);
  };

  const getPerformanceExplainer = (row, pastSessions) => {
    const bits = [];
    const footing = footingKey(row).replace("unknown:", "").replace(":unknown", "").replace(/:/g, " · ");
    const last400 = sec(firstVal(row, ["Time last 400m"]));
    const last600 = sec(firstVal(row, ["Time last 600m"]));
    const best200 = sec(firstVal(row, ["Time best 200m"]));
    const top = toFloat(firstVal(row, ["Max Speed","Top Speed","Maximum speed"]));
    const z5 = toFloat(firstVal(row, ["Duration effort zone 5"]));
    const dist = toFloat(firstVal(row, ["Gallop distance","Distance","Total distance"]));

    const poolFooting = (pastSessions || []).filter(s => footingKey(s) === footingKey(row));
    const pool = poolFooting.length ? poolFooting : (pastSessions || []);
    const avg = (arr) => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : null;

    const avg400 = avg(pool.map(s => sec(firstVal(s, ["Time last 400m"]))).filter(Number.isFinite));
    const avg600 = avg(pool.map(s => sec(firstVal(s, ["Time last 600m"]))).filter(Number.isFinite));
    const avgTop = avg(pool.map(s => toFloat(firstVal(s, ["Max Speed","Top Speed","Maximum speed"]))).filter(Number.isFinite));

    if (Number.isFinite(last400) && Number.isFinite(avg400)) {
      const d = avg400 - last400;
      if (d >= 0.4) bits.push("strong last 400m");
      else if (d >= 0.1) bits.push("last 400m quicker than usual");
      else if (d <= -0.4) bits.push("last 400m below usual");
    }
    if (Number.isFinite(last600) && Number.isFinite(avg600)) {
      const d = avg600 - last600;
      if (d >= 0.6) bits.push("home strong last 600m");
      else if (d <= -0.6) bits.push("last 600m slower than usual");
    }
    if (Number.isFinite(best200) && best200 <= 12) bits.push("sharp 200m split");
    if (Number.isFinite(top) && Number.isFinite(avgTop)) {
      const d = top - avgTop;
      if (d >= 1.0) bits.push(`top speed ↑ (${top.toFixed(1)} km/h)`);
      else if (d <= -1.0) bits.push("top speed below usual");
    }
    if (Number.isFinite(z5)) {
      const min5 = z5/60;
      if (min5 >= 3) bits.push("good Zone 5 exposure");
      else if (min5 < 1) bits.push("limited Zone 5");
    }
    if (Number.isFinite(dist)) {
      if (dist >= 2000) bits.push("solid work volume");
      else if (dist < 1200) bits.push("short main work");
    }
    if (footing && footing !== "unknown:unknown") bits.push(footing);

    return bits.length ? bits.join(" · ") : "Session output in line with usual";
  };

  // ===== Bands & Quality =====
  const BAND_COLORS = {
    DARK_GREEN: "#2aa84a",
    LIGHT_GREEN: "#70c46c",
    YELLOW: "#f2b705",
    ORANGE: "#f28c28",
    RED: "#e55353",
  };

  const getRecoveryBand = (secs, type /* '65' | '55' */) => {
    if (!Number.isFinite(secs)) return { label: null, color: "#999" };
    if (type === "65") {
      if (secs <= 70)  return { label: "✅✅ Excellent", color: BAND_COLORS.DARK_GREEN };
      if (secs <= 95)  return { label: "✅ Very Good",  color: BAND_COLORS.LIGHT_GREEN };
      if (secs <= 120) return { label: "🎯 Fair",       color: BAND_COLORS.YELLOW };
      if (secs <= 150) return { label: "🟠 Slow",       color: BAND_COLORS.ORANGE };
      return               { label: "🔴 Very Slow",     color: BAND_COLORS.RED };
    }
    if (secs <= 100) return { label: "✅✅ Excellent", color: BAND_COLORS.DARK_GREEN };
    if (secs <= 140) return { label: "✅ Very Good",  color: BAND_COLORS.LIGHT_GREEN };
    if (secs <= 180) return { label: "🎯 Fair",       color: BAND_COLORS.YELLOW };
    if (secs <= 240) return { label: "🟠 Slow",       color: BAND_COLORS.ORANGE };
    return               { label: "🔴 Very Slow",     color: BAND_COLORS.RED };
  };

  const QualityBadge = ({ label, color }) => (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 8px",
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,0.05)",
        background: "rgba(0,0,0,0.03)",
        fontSize: 12,
        fontWeight: 600,
        lineHeight: 1,
      }}
      title={label || ""}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: color || "#999",
          display: "inline-block",
        }}
      />
      <span>{label || "—"}</span>
    </span>
  );

  const arioneo65Fallback = [
    { max: 70, label: "✅✅ Excellent" },
    { max: 95, label: "✅ Very Good" },
    { max: 120, label: "🎯 Fair" },
    { max: 150, label: "🟠 Slow" },
    { max: Infinity, label: "🔴 Very Slow" },
  ];
  const arioneo55Fallback = [
    { max: 100, label: "✅✅ Excellent" },
    { max: 140, label: "✅ Very Good" },
    { max: 180, label: "🎯 Fair" },
    { max: 240, label: "🟠 Slow" },
    { max: Infinity, label: "🔴 Very Slow" },
  ];
  const QUALITY_55_ALIASES = [
    "Quality of Time to 55% of the max HR",
    "Quality of time to 55%",
    "Quality of Time to 55 %",
  ];
  const TIME_TO_65_ALIASES = ["Time to 65 % of the max HR", "Time to 65 % of the max HR "];
  const TIME_TO_55_ALIASES = ["Time to 55 % of the max HR", "Time to 55 % of the max HR "];

  const getTimeQualityData = (
    latest,
    pastSessions,
    getEffortLevel,
    getEffortLevelDetailed,
    footingKey,
    timeFieldAliases,
    qualityAliasesOrNull,
    fallbackThresholds,
    type
  ) => {
    const current = toFloat(firstVal(latest, timeFieldAliases));
    if (!Number.isFinite(current)) return { label: null, color: "#999", comment: null };

    let label = null;
    if (Array.isArray(qualityAliasesOrNull) && qualityAliasesOrNull.length) {
      const raw = firstVal(latest, qualityAliasesOrNull);
      if (raw) {
        const t = normStr(raw);
        if (t.startsWith("excellent")) label = "✅✅ Excellent";
        else if (t.startsWith("very good") || t.startsWith("good")) label = "✅ Very Good";
        else if (t.startsWith("fair") || t.startsWith("average") || t.startsWith("acceptable")) label = "🎯 Fair";
        else if (t.startsWith("slow")) label = "🟠 Slow";
        else if (t.startsWith("poor") || t.startsWith("bad") || t.startsWith("very slow")) label = "🔴 Very Slow";
        else label = raw;
      }
    }
    if (!label) {
      for (const { max, label: lab } of fallbackThresholds) { if (current <= max) { label = lab; break; } }
      if (!label) label = fallbackThresholds[fallbackThresholds.length - 1].label;
    }

    const band = getRecoveryBand(current, type);

    const thisEffortDetail = getEffortLevelDetailed(latest);
    const thisEffort = thisEffortDetail.level;
    const thisFooting = footingKey(latest);

    const candidates = pastSessions
      .map((s) => ({
        row: s,
        val: toFloat(firstVal(s, timeFieldAliases)),
        effort: getEffortLevel(s),
        footing: footingKey(s),
      }))
      .filter((x) => Number.isFinite(x.val));

    const sameEffortAndFooting = candidates.filter(
      (x) => thisEffort && x.effort && x.effort === thisEffort && thisFooting && x.footing && x.footing === thisFooting
    );
    const sameEffortOnly = candidates.filter((x) => thisEffort && x.effort && x.effort === thisEffort);
    const sameFootingOnly = candidates.filter((x) => thisFooting && x.footing && x.footing === thisFooting);

    let compareSet = sameEffortAndFooting;
    let scope = "similar sessions (same effort & footing)";
    if (!compareSet.length && sameEffortOnly.length) { compareSet = sameEffortOnly; scope = "sessions with similar effort"; }
    if (!compareSet.length && sameFootingOnly.length) { compareSet = sameFootingOnly; scope = "sessions on similar footing"; }
    if (!compareSet.length && candidates.length) { compareSet = candidates; scope = "all past sessions"; }

    let trend = "no past data for comparison";
    let diffSec = 0;
    if (compareSet.length) {
      const avgPast = compareSet.reduce((a, b) => a + b.val, 0) / compareSet.length;
      diffSec = current - avgPast;
      trend =
        Math.abs(diffSec) < 0.1
          ? `in line with ${scope}`
          : diffSec < 0
          ? `${Math.abs(diffSec).toFixed(1)}s faster than ${scope}`
          : `${diffSec.toFixed(1)}s slower than ${scope}`;

      if (compareSet.length < 3) trend += " (limited past data; indicative only)";
    }

    const slowish = /slow|fair/i.test(label);
    const excellentish = /excellent|very good/i.test(label);

    const footingTxt = (() => {
      const [surf, grd] = (thisFooting || "").split(":");
      const parts = [];
      if (surf && surf !== "unknown") parts.push(surf);
      if (grd && grd !== "unknown") parts.push(grd);
      return parts.length ? parts.join(" ") : null;
    })();

    let overlay = "";
    if (slowish) {
      if (diffSec < 0) overlay = " — improving versus similar conditions";
      else overlay = footingTxt ? ` — slower than expected for ${footingTxt}; monitor` : " — slower than expected; monitor";
    } else if (excellentish) {
      overlay = footingTxt ? ` — excellent for ${footingTxt}` : " — excellent for the given conditions";
    }

    if (thisEffortDetail.source === "calculated") {
      trend += " (effort calculated from speed/sectionals/workload)";
    }

    return { label, color: band.color, comment: `${trend}${overlay}` };
  };

  // -------------------- Stride expectations --------------------
  const expectedStride60 = useMemo(() => {
    if (!latest) return "N/A";
    const surfBucket = bucketSurface(getSurfaceRaw(latest));
    const strideKey = "Stride length at 60 km/h";
    const past = pastSessions
      .filter((s) => bucketSurface(getSurfaceRaw(s)) === surfBucket)
      .map((s) => toFloat(s[strideKey]))
      .filter(Number.isFinite)
      .slice(0, 4);
    if (!past.length) return "N/A";
    const total = past.reduce((sum, v) => sum + v, 0);
    return (total / past.length).toFixed(2);
  }, [latest, pastSessions]);

  const getStrideAlert = () => {
    const actual = toFloat(latest?.["Stride length at 60 km/h"]);
    const expected = toFloat(expectedStride60);
    if (!Number.isFinite(actual) || !Number.isFinite(expected)) return null;
    const diff = actual - expected;
    const diffTxt = ` (Δ ${diff.toFixed(2)} m)`;
    if (diff < -0.45) return "🔴 Severe reduction, possible underperformance" + diffTxt;
    if (diff < -0.3) return "🔶 Below expected stride, may need monitoring" + diffTxt;
    if (diff > 0.3) return "🟡 Longer stride than usual – possible overreaching" + diffTxt;
    return "✅ Stride is within expected range" + diffTxt;
  };

  const getRecoveryAlert = () => {
    const fast = toFloat(firstVal(latest, [
      "Fast Recovery in % of max HR", "Fast Recovery % MaxHR", "Fast Recovery",
    ]));
    if (fast === null) return null;
    if (fast <= 38) return "✅✅ Low intensity of effort required";
    if (fast <= 45) return "✅ Handled intensity of effort well";
    if (fast <= 55) return "🎯 Productive workload, expected effort. Optimal for fitness gains";
    if (fast <= 60) return "🔶 Fair intensity of effort required";
    return "🔴 High intensity of effort felt from training";
  };

  const getHRAlert = (val, minType) => {
    const percent = toFloat(val);
    if (!Number.isFinite(percent)) return null;
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
      if (percent <= 50) return "🔶 Slower recovery, continue to monitor workload";
      return "🔴 Poor recovery, horse still in high stress";
    }
    return null;
  };

  const getAcidoseComment = () => {
    const val = toFloat(latest?.["Acidose"]); // seconds
    if (!Number.isFinite(val)) return null;
    if (val <= 25) return "✅✅ Excellent lactate clearance (lower seconds is better)";
    if (val <= 35) return "✅ Good clearance (lower seconds is better)";
    if (val <= 45) return "🎯 Acceptable range, monitor trend";
    if (val <= 60) return "🔶 Slower clearance than expected";
    return "🔴 Poor lactate clearance — extended recovery time";
  };

  const getMaxHRAlert = () => {
    const maxHR = toFloat(latest?.["Max Heart Rate reached during training"]);
    const pastHRs = pastSessions
      .map((s) => toFloat(s["Max Heart Rate reached during training"]))
      .filter((v) => Number.isFinite(v));
    if (!Number.isFinite(maxHR) || pastHRs.length < 2) return null;
    const avg = pastHRs.reduce((a, b) => a + b, 0) / pastHRs.length;
    if (Math.abs(maxHR - avg) <= 5) return "✅ Consistent with usual performance";
    return "⚠️ Check HR graph. HR not within expected range";
  };

  const getTopSpeedComment = () => {
    const top = toFloat(latest?.["Max Speed"]);
    const pastSpeeds = pastSessions.map((s) => toFloat(s["Max Speed"])).filter(Number.isFinite);
    if (!Number.isFinite(top) || pastSpeeds.length < 2) return null;
    const avg = pastSpeeds.reduce((a,b)=>a+b,0)/pastSpeeds.length;
    const diff = top - avg;
    if (diff > 1.5) return "✅ New top-end effort — strong finishing speed";
    if (diff > 0.5) return "🎯 Good speed shown — slightly above average";
    if (Math.abs(diff) <= 1.0) return "✅ Within expected range (±1.0 km/h)";
    if (diff < -1.5) return "🔶 Below usual top speed — context check";
    return "🔶 Slightly below average — monitor next session";
  };

  const zoneRanges = { 1: "50–60%", 2: "60–70%", 3: "70–80%", 4: "80–90%", 5: "90–100%" };

  const getZoneComment = (zone, duration) => {
    const secs = toFloat(duration);
    if (!Number.isFinite(secs)) return "";
    const mins = secs / 60;
    switch (zone) {
      case 1: return "✅ Recovery zone — aerobic base";
      case 2: return "✅ Aerobic conditioning";
      case 3: return "🎯 Threshold development";
      case 4: return "🔶 High-intensity threshold";
      case 5:
        if (mins <= 1) return "✅✅ Short burst — low risk";
        if (mins <= 2) return "✅ Brief anaerobic sprint";
        if (mins <= 4) return "🎯 Sustained anaerobic";
        if (mins <= 6) return "🔶 Prolonged anaerobic — monitor";
        return "🔴 Excessive anaerobic — overload risk";
      default: return "";
    }
  };

  // -------------------- Header --------------------
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
        aria-label="Go to dashboard"
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
          aria-label="Back"
        >
          ← Back
        </button>
        <button
          onClick={async () => {
            try { await signOut(auth); } catch (e) { console.error("Sign out failed", e); }
          }}
          style={{
            background: "#0c3050ff",
            color: "#fff",
            padding: "8px 14px",
            border: "none",
            borderRadius: 6,
            fontWeight: 600,
            cursor: "pointer",
          }}
          aria-label="Log out"
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0d3557")}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0c3050ff")}
        >
          Log out
        </button>
      </div>
    </header>
  );

  // -------------------- UI Return --------------------
  if (!latest) {
    return (
      <div style={{ paddingTop: 64 }}>
        <Header />
        <div style={{ padding: 24, color: "#fff", background: "#0c3050ff" }}>
          No sessions found for {horseName}.
        </div>
      </div>
    );
  }

  const shouldShowHandlingScore = isNum(handlingSolo) && canScoreHandling;

  return (
    <div style={{ paddingTop: 64 }}>
      <Header />
      <div style={{ background: "#0c3050ff", minHeight: "calc(100vh - 64px)", padding: 20 }}>
        <div className="hp-container">
          {/* Title + sessions dropdown */}
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
                onChange={(e) => setSelectedSessionIndex(Number(e.target.value))}
                style={{ margin: "0 auto" }}
                aria-label="Select session"
              >
                {sessions.map((session, index) => {
                  const parts = [
                    formatDate(session.Date),
                    session["Training type"],
                    session["Track name"],
                    session["Track condition"] ?? session["Track surface"] ?? session["Surface"],
                  ].filter(Boolean);
                  return (
                    <option key={`${session.Date ?? "no-date"}-${index}`} value={index}>
                      {parts.join(" – ")}
                    </option>
                  );
                })}
              </select>
            )}

            <div style={{ marginTop: 8, fontWeight: 600, color: "#0B1E3C" }}>
              {sessions.length} session{sessions.length === 1 ? "" : "s"} found
            </div>
          </div>

          {/* Handling — full width */}
          <div className="hp-card" style={{ marginBottom: 16, borderLeft: `8px solid ${shouldShowHandlingScore ? "rgb(106,192,121)" : "#888"}` }}>
            <h3>Handling (Recovery) — This Session</h3>
            <div
              style={{
                minWidth: 220,
                border: "1px solid #e5e8f0",
                borderRadius: 10,
                padding: 12,
                background: "#f7f9ff",
                display: "inline-block",
                width: "100%",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0B1E3C", opacity: 0.8, marginBottom: 6 }}>
                Handling Score
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#0B1E3C" }}>
                {shouldShowHandlingScore ? `${Math.min(9.5, handlingSolo).toFixed(1)} / 10` : "Not enough data"}
              </div>
              <div style={{ fontSize: 12, color: "#445", marginTop: 8, lineHeight: 1.4 }}>
                <strong>What it means:</strong> shows how well the horse recovered after work. It combines heart rates at 5, 10 and 15 minutes, plus the “Fast Recovery” %, and adjusts for how demanding the session was <em>and the track conditions</em>. Lower heart rates and quicker recovery mean a stronger score.
              </div>
            </div>
          </div>

          {/* Performance — full width */}
          <div className="hp-card" style={{ marginBottom: 16, borderLeft: `8px solid rgb(106,192,221)` }}>
            <h3>Performance — This Session</h3>
            <div
              style={{
                minWidth: 220,
                border: "1px solid #e5e8f0",
                borderRadius: 10,
                padding: 12,
                background: "#f7fbff",
                display: "inline-block",
                width: "100%",
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 700, color: "#0B1E3C", opacity: 0.8, marginBottom: 6 }}>
                Performance Score
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#0B1E3C" }}>
                {(() => {
                  const perfScore = getPerformanceScore(latest, pastSessions);
                  return isNum(perfScore) ? `${Math.min(9.5, perfScore).toFixed(1)} / 10` : "Not enough data captured to give accurate score";
                })()}
              </div>
              <div style={{ fontSize: 12, color: "#445", marginTop: 8, lineHeight: 1.4 }}>
                <strong>What it means:</strong> shows the quality of the work itself. It factors in finishing sectionals (last 400m/600m), top speed, best splits, time in Zone 4–5, and gallop distance, compared against the horse’s own recent history <em>and the track conditions</em>. Strong finishes, high speed and solid work volume mean a stronger score.
              </div>
            </div>
          </div>

          {/* Today’s Takeaways */}
          <div className="hp-card" style={{ marginBottom: 12, background: "#f9fbff" }}>
            <h3>Today’s Takeaways</h3>
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {(() => {
                const items = [];
                const perfExplainer = getPerformanceExplainer(latest, pastSessions);
                const strideMsg = getStrideAlert();
                const recMsg = getRecoveryAlert();

                if (perfExplainer && perfExplainer !== "Session output in line with usual")
                  items.push(`✔ ${perfExplainer}`);
                if (recMsg) items.push(recMsg.startsWith("✅") ? recMsg : `⚠ ${recMsg}`);
                if (strideMsg) items.push(strideMsg);

                const q55 = getTimeQualityData(
                  latest, pastSessions, getEffortLevel, getEffortLevelDetailed, footingKey,
                  TIME_TO_55_ALIASES, QUALITY_55_ALIASES, arioneo55Fallback, "55"
                );
                if (q55?.label && /slow|fair/i.test(q55.label)) {
                  items.push(`⚠ Time to 55%: ${q55.label.replace(/^[^\s]+\s/, "")}`);
                }

                return items.slice(0, 3).map((t, i) => <li key={i} style={{ marginBottom: 4 }}>{t}</li>);
              })()}
            </ul>
          </div>

          {/* Optional debug */}
          {SHOW_CALC_FR_DEBUG && (
            <div className="hp-card" style={{ marginBottom: 12, background: "#f9fbff" }}>
              <h3>Effort (debug)</h3>
              <div style={{ fontSize: 14, lineHeight: 1.6 }}>
                <div>
                  Effort level: <strong style={{ textTransform: "capitalize" }}>{getEffortLevel(latest)}</strong>
                </div>
                <div>Calculated FR%: <strong>{Number.isFinite(effortDetail?.frCalcPct) ? `${effortDetail.frCalcPct.toFixed(1)}%` : "N/A"}</strong></div>
                <div>
                  Actual Fast Recovery %:{" "}
                  <strong>{asPct(firstVal(latest, ["Fast Recovery in % of max HR","Fast Recovery % MaxHR","Fast Recovery"]))}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Sectional Times (still always visible) */}
          <h2 className="hp-section-title">Sectional Times</h2>
          <div className="hp-grid" style={{ marginBottom: 16 }}>
            <div className="hp-card sectional-card"><h3>Last 800m</h3><div className="stat-value">{formatSectional(latest?.["Time last 800m"])}</div></div>
            <div className="hp-card sectional-card"><h3>Last 600m</h3><div className="stat-value">{formatSectional(latest?.["Time last 600m"])}</div></div>
            <div className="hp-card sectional-card"><h3>Last 400m</h3><div className="stat-value">{formatSectional(latest?.["Time last 400m"])}</div></div>
            <div className="hp-card sectional-card"><h3>Last 200m</h3><div className="stat-value">{formatSectional(latest?.["Time last 200m"])}</div></div>
            <div className="hp-card sectional-card"><h3>Best 600m</h3><div className="stat-value">{formatSectional(latest?.["Time best 600m"])}</div></div>
            <div className="hp-card sectional-card"><h3>Best 200m</h3><div className="stat-value">{formatSectional(latest?.["Time best 200m"])}</div></div>
          </div>

          {/* Collapsible sections */}
          <Collapsible title="Fitness & Recovery" defaultOpen={false}>
            <Row
              label="Fast Recovery (Intensity of Effort)"
              value={asPct(firstVal(latest, ["Fast Recovery in % of max HR","Fast Recovery % MaxHR","Fast Recovery"]))}
              comment={getRecoveryAlert()}
            />
            <Row
              label="Acidose (lactate recovery delay — lower seconds is better)"
              value={parseTime(latest?.["Acidose"])}
              comment={getAcidoseComment()}
            />
            <Row
              label="HR in % after 5 min"
              value={asPct(firstVal(latest, ["HR after 5 min in % of max HR","HR5_pct"]))}
              comment={getHRAlert(firstVal(latest, ["HR after 5 min in % of max HR","HR5_pct"]), 5)}
            />
            <Row
              label="HR in % after 10 min"
              value={asPct(firstVal(latest, ["HR after 10 min in % of max HR","HR10_pct"]))}
              comment={getHRAlert(firstVal(latest, ["HR after 10 min in % of max HR","HR10_pct"]), 10)}
            />
            <Row
              label="HR in % after 15 min (Overall Recovery)"
              value={asPct(firstVal(latest, ["HR after 15 min in % of max HR","HR15_pct"]))}
              comment={getHRAlert(firstVal(latest, ["HR after 15 min in % of max HR","HR15_pct"]), 15)}
            />

            {(() => {
              const q65 = getTimeQualityData(
                latest, pastSessions, getEffortLevel, getEffortLevelDetailed, footingKey,
                TIME_TO_65_ALIASES, null, arioneo65Fallback, "65"
              );
              return (
                <Row
                  label="Time to 65% Max HR"
                  value={parseTime(firstVal(latest, TIME_TO_65_ALIASES))}
                  comment={q65.label ? (<><QualityBadge label={q65.label} color={q65.color} /> — {q65.comment}</>) : q65.comment}
                />
              );
            })()}

            {(() => {
              const q55 = getTimeQualityData(
                latest, pastSessions, getEffortLevel, getEffortLevelDetailed, footingKey,
                TIME_TO_55_ALIASES, QUALITY_55_ALIASES, arioneo55Fallback, "55"
              );
              return (
                <Row
                  label="Time to 55% Max HR"
                  value={parseTime(firstVal(latest, TIME_TO_55_ALIASES))}
                  comment={q55.label ? (<><QualityBadge label={q55.label} color={q55.color} /> — {q55.comment}</>) : q55.comment}
                />
              );
            })()}
          </Collapsible>

          <Collapsible title="Stride Data" defaultOpen={false}>
            <Row
              label="Stride Length at 60 km/h"
              value={parse(latest?.["Stride length at 60 km/h"]) === "N/A" ? "N/A" : `${parse(latest?.["Stride length at 60 km/h"])} m`}
              comment={getStrideAlert()}
            />
            <Row
              label="Stride Frequency at 60 km/h"
              value={parse(latest?.["Stride frequency at 60 km/h"]) === "N/A" ? "N/A" : `${parse(latest?.["Stride frequency at 60 km/h"])} st/s`}
              comment=""
            />
            <Row label="Expected Stride Length @60" value={expectedStride60 === "N/A" ? "N/A" : `${expectedStride60} m`} comment="" />
            <Row label="Max Stride Length" value={parse(latest?.["Max stride length"]) === "N/A" ? "N/A" : `${parse(latest?.["Max stride length"])} m`} comment="" />
            <Row label="Max Stride Frequency" value={parse(latest?.["Max Stride Frequency"]) === "N/A" ? "N/A" : `${parse(latest?.["Max Stride Frequency"])} st/s`} comment="" />
          </Collapsible>

          <Collapsible title="Heart Rate Analysis" defaultOpen={false}>
            <Row
              label="Max HR"
              value={parse(latest?.["Max Heart Rate reached during training"]) === "N/A" ? "N/A" : `${parse(latest?.["Max Heart Rate reached during training"])} bpm`}
              comment={getMaxHRAlert()}
            />
          </Collapsible>

          <Collapsible title="Effort Zone Durations" defaultOpen={false}>
            {[1,2,3,4,5].map((zone) => (
              <Row
                key={`zone-${zone}`}
                label={`Zone ${zone} Duration (${zoneRanges[zone]})`}
                value={parseTime(latest?.[`Duration effort zone ${zone}`])}
                comment={getZoneComment(zone, latest?.[`Duration effort zone ${zone}`])}
              />
            ))}
          </Collapsible>

          <Collapsible title="Performance Metrics" defaultOpen={false}>
            <Row
              label="Max Speed"
              value={parse(latest?.["Max Speed"]) === "N/A" ? "N/A" : `${parse(latest?.["Max Speed"])} km/h`}
              comment={getTopSpeedComment()}
            />
            <Row label="Gallop distance" value={fmtMeters(latest?.["Gallop distance"])} comment="" />
            <Row label="Distance of the main work up to the finish line" value={fmtMeters(latest?.["Distance of the main work up to the finish line"])} comment="" />
            <div className="hp-grid" style={{ marginTop: 8 }}>
              {[1,2,3,4,5].map((z) => {
                const val = fmtMeters(latest?.[`Distance effort zone ${z}`]);
                return (
                  <div key={`dz-${z}`} className="hp-card sectional-card">
                    <h3>{`Zone ${z} Distance`}</h3>
                    <div className="stat-value">{val}</div>
                  </div>
                );
              })}
            </div>
          </Collapsible>

        </div>
      </div>
    </div>
  );
}

// ===== Small components =====
function Tooltip({ children, content }) {
  const [open, setOpen] = useState(false);
  return (
    <div
      style={{ position: "relative", display: "inline-block" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {children}
      {open && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            top: "120%",
            left: "50%",
            transform: "translateX(-50%)",
            minWidth: 220,
            maxWidth: 360,
            padding: "10px 12px",
            borderRadius: 8,
            background: "rgba(15,22,36,0.95)",
            color: "#fff",
            fontSize: 12,
            lineHeight: 1.35,
            boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            zIndex: 2000,
            pointerEvents: "none",
            whiteSpace: "pre-wrap",
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

function Row({ label, value, comment }) {
  return (
    <div className="hp-row">
      <div className="hp-row-label">{label}</div>
      <div className="hp-row-value">{value}</div>
      <div className="hp-row-comment">{comment}</div>
    </div>
  );
}

function Collapsible({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="hp-card" style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        style={{
          width: "100%",
          textAlign: "left",
          background: "transparent",
          border: "none",
          padding: "10px 12px",
          fontWeight: 800,
          color: "#0B1E3C",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
        }}
      >
        <span>{title}</span>
        <span style={{ fontWeight: 800 }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div style={{ borderTop: "1px solid #e5e8f0", padding: "12px 12px 4px" }}>
          {children}
        </div>
      )}
    </div>
  );
}
// ===== End HorsePage.jsx =====