// src/utils/scoring.js
// Single‑session Handling score (0–10), robust to header variants.
// Uses whichever of these exist on the row:
//
// - HR after 15 min in % of max HR  | HR15_pct
// - Acidose
// - Fast Recovery in % of max HR    | Fast Recovery % MaxHR | Fast Recovery
// - HR after 10 min in % of max HR  | HR10_pct
// - HR after 5 min in % of max HR   | HR5_pct
// - HR after 3 min in % of max HR   | HR3_pct
//
// Requires at least TWO metrics present. Missing metrics are skipped and weights re-normalized.

const isNum = (v) => typeof v === "number" && Number.isFinite(v);

const toNum = (v) => {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).trim();
  // time like m:ss or mm:ss.t
  if (/^\d{1,2}:\d{2}(\.\d+)?$/.test(s)) {
    const [m, rest] = s.split(":");
    const mm = Number(m), ss = Number(rest);
    return Number.isFinite(mm) && Number.isFinite(ss) ? mm * 60 + ss : null;
  }
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

// linear interpolation on piecewise points: [{x, y}, ...], y in [0,1]
function piecewise01(x, points) {
  if (!isNum(x) || !points?.length) return null;
  if (x <= points[0].x) return points[0].y;
  if (x >= points[points.length - 1].x) return points[points.length - 1].y;
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    if (x >= a.x && x <= b.x) {
      const t = (x - a.x) / (b.x - a.x || 1);
      return a.y + t * (b.y - a.y);
    }
  }
  return null;
}

// first existing value by priority
function firstVal(row, keys) {
  for (const k of keys) {
    const v = row?.[k];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return undefined;
}

/**
 * scoreHandlingSingle(row)
 * Deterministic, single‑session handling score (0–10)
 */
export function scoreHandlingSingle(row) {
  if (!row || typeof row !== "object") return { HandlingScore: null, parts: {} };

  // Read with safe fallbacks (prefer your standard labels if present)
  const hr15 = toNum(firstVal(row, ["HR after 15 min in % of max HR", "HR15_pct"]));
  const acid = toNum(firstVal(row, ["Acidose"]));
  const fr   = toNum(firstVal(row, ["Fast Recovery in % of max HR", "Fast Recovery % MaxHR", "Fast Recovery"]));
  const hr10 = toNum(firstVal(row, ["HR after 10 min in % of max HR", "HR10_pct"]));
  const hr5  = toNum(firstVal(row, ["HR after 5 min in % of max HR", "HR5_pct"]));
  const hr3  = toNum(firstVal(row, ["HR after 3 min in % of max HR", "HR3_pct"]));

  // Piecewise anchors (lower is better for all these)
  const S_hr15 = piecewise01(hr15, [
    { x: 30, y: 1.0 }, { x: 35, y: 0.9 }, { x: 40, y: 0.8 },
    { x: 45, y: 0.6 }, { x: 50, y: 0.4 }, { x: 55, y: 0.2 },
    { x: 60, y: 0.1 }, { x: 70, y: 0.0 },
  ]);

  const S_acid = piecewise01(acid, [
    { x:  30, y: 1.0 }, // 0:30
    { x:  60, y: 0.9 }, // 1:00
    { x:  90, y: 0.7 }, // 1:30
    { x: 120, y: 0.5 }, // 2:00
    { x: 180, y: 0.2 }, // 3:00
    { x: 240, y: 0.0 }, // 4:00+
  ]);

  // Fast Recovery % of max HR: lower = handled easier
  const S_fr = piecewise01(fr, [
    { x: 35, y: 1.0 }, { x: 40, y: 0.9 }, { x: 45, y: 0.7 },
    { x: 50, y: 0.5 }, { x: 55, y: 0.3 }, { x: 60, y: 0.1 },
    { x: 70, y: 0.0 },
  ]);

  const S_hr10 = piecewise01(hr10, [
    { x: 30, y: 1.0 }, { x: 35, y: 0.9 }, { x: 40, y: 0.8 },
    { x: 45, y: 0.6 }, { x: 50, y: 0.4 }, { x: 55, y: 0.2 },
    { x: 60, y: 0.0 },
  ]);

  const S_hr5 = piecewise01(hr5, [
    { x: 30, y: 1.0 }, { x: 35, y: 0.9 }, { x: 40, y: 0.8 },
    { x: 50, y: 0.5 }, { x: 57, y: 0.2 }, { x: 65, y: 0.0 },
  ]);

  const S_hr3 = piecewise01(hr3, [
    { x: 35, y: 1.0 }, { x: 40, y: 0.8 }, { x: 45, y: 0.6 },
    { x: 55, y: 0.3 }, { x: 65, y: 0.0 },
  ]);

  // Weights (sum to 1.0)
  const W = { hr15: 0.35, acid: 0.20, fr: 0.20, hr10: 0.10, hr5: 0.10, hr3: 0.05 };

  // Weight‑normalized aggregation (use only present metrics)
  let sum = 0, wsum = 0, present = 0;
  const acc = (score, w) => { if (score != null) { sum += w * score; wsum += w; present++; } };
  acc(S_hr15, W.hr15);
  acc(S_acid, W.acid);
  acc(S_fr,   W.fr);
  acc(S_hr10, W.hr10);
  acc(S_hr5,  W.hr5);
  acc(S_hr3,  W.hr3);

  // Need at least 2 metrics to be meaningful
  const score01 = present >= 2 && wsum > 0 ? sum / wsum : null;
  const HandlingScore = score01 == null ? null : +(Math.max(0, Math.min(1, score01)) * 10).toFixed(2);

  return {
    HandlingScore,
    parts: { hr15, acid, fr, hr10, hr5, hr3 },
  };
}