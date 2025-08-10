export function scoreSessions(rows) {
  if (!Array.isArray(rows) || !rows.length) return [];

  const groups = groupBy(rows, (r) => `${r["Training type"] ?? "NA"}|${r["Track condition"] ?? "NA"}`);
  const scored = [];

  for (const [groupKey, grp] of groups.entries()) {
    // Fit HR@3min ~ Fast Recovery % MaxHR
    const xs = grp.map((r) => r["Fast Recovery % MaxHR"] ?? null);
    const ys = grp.map((r) => r["Heart rate after 3 min"] ?? null);
    const { a, b } = linearFit(xs, ys);

    // Robust percentiles for normalization
    const getP = (key) => {
      const vals = grp.map((r) => r[key]).filter(Number.isFinite);
      return { p10: percentile(vals, 0.10), p90: percentile(vals, 0.90) };
    };
    const P = {
      HR15:  getP("HR15_pct"),
      Acid:  getP("Acidose"),
      T65:   getP("Time to 65 % of the max HR"),
      T55:   getP("Time to 55 % of the max HR"),
      Top:   getP("Max Speed"),
      L400:  getP("Time last 400m"),
      Accel: getP("Highest measured acceleration"),
    };

    // Medians used only for health flagging
    const med = (arr) => {
      const a1 = arr.filter(Number.isFinite).sort((x,y)=>x-y);
      if (!a1.length) return null;
      const i = Math.floor(a1.length/2);
      return a1.length%2 ? a1[i] : (a1[i-1]+a1[i])/2;
    };
    const HR15_med  = med(grp.map(r=>r["HR15_pct"]));
    const Accel_med = med(grp.map(r=>r["Highest measured acceleration"]));

    // Precompute residual min/max (inverted) for normalization
    const invResiduals = grp
      .map((g) => {
        const gfr = g["Fast Recovery % MaxHR"], g3 = g["Heart rate after 3 min"];
        if (gfr == null || g3 == null) return null;
        return -(g3 - (a + b*gfr));
      })
      .filter(Number.isFinite);
    const invResP10 = percentile(invResiduals, 0.10);
    const invResP90 = percentile(invResiduals, 0.90);

    for (const r of grp) {
      const trainingType = (r["Training type"] || "").toLowerCase();
      const isTrial = trainingType.includes("trial");
      const intensity = tagIntensity(r); // maintenance | solid | hard

      // Expected vs actual HR@3min residual
      const fr   = r["Fast Recovery % MaxHR"];
      const hr3  = r["Heart rate after 3 min"];
      const exp3 = fr == null ? null : a + b*fr;
      const resid = (hr3 == null || exp3 == null) ? null : (hr3 - exp3);

      // Recovery block components (robust-normalized; higher = better)
      const scHR15 = rnorm(r["HR15_pct"],                       P.HR15.p10, P.HR15.p90, true);
      const scAcid = rnorm(r["Acidose"],                        P.Acid.p10, P.Acid.p90, true);
      const scT65  = rnorm(r["Time to 65 % of the max HR"],     P.T65.p10,  P.T65.p90,  true);
      const scT55  = rnorm(r["Time to 55 % of the max HR"],     P.T55.p10,  P.T55.p90,  true);
      const scRes  = resid == null ? null : rnorm(-resid, invResP10, invResP90, false);

      // Relative recovery vs similar sessions (0..1)
      const rel65 = relativeTimeScore(rows, r, "Time to 65 % of the max HR");
      const rel55 = relativeTimeScore(rows, r, "Time to 55 % of the max HR");
      const scRel = (rel65!=null && rel55!=null) ? (rel65+rel55)/2 : (rel65 ?? rel55 ?? null);

      // Performance & locomotion
      const scTop   = rnorm(r["Max Speed"],                   P.Top.p10,   P.Top.p90,   false);
      const scL400  = rnorm(r["Time last 400m"],              P.L400.p10,  P.L400.p90,  true);
      const scAccel = rnorm(r["Highest measured acceleration"], P.Accel.p10, P.Accel.p90, false);

      // Build Recovery block (allow missing)
      const recParts = [];
      if (scHR15!=null) recParts.push(0.55*scHR15);
      if (scRes !=null) recParts.push(0.10*scRes);
      if (scAcid!=null) recParts.push(0.15*scAcid);
      if (scT65 !=null) recParts.push(0.10*scT65);
      if (scT55 !=null) recParts.push(0.05*scT55);
      if (scRel !=null) recParts.push(0.05*scRel);
      const Recovery_block = recParts.length ? recParts.reduce((a,c)=>a+c,0) : null;

      // Performance block (avg of available)
      const perfParts = [];
      if (scTop  !=null) perfParts.push(scTop);
      if (scL400 !=null) perfParts.push(scL400);
      const Performance_block = perfParts.length ? perfParts.reduce((a,c)=>a+c,0)/perfParts.length : null;

      // Locomotion block (accel only for now)
      const Locomotion_block = scAccel == null ? null : scAccel;

      // --------- NO pathology in score; separate alert only ----------
      let HealthAlert = null;
      if (
        HR15_med != null &&
        Accel_med != null &&
        r["HR15_pct"] != null &&
        r["Highest measured acceleration"] != null &&
        r["HR15_pct"] > HR15_med &&
        r["Highest measured acceleration"] < Accel_med
      ) {
        HealthAlert = "Possible red flag: slower recovery with reduced acceleration — review horse/conditions.";
      }

      // Weights by context (redistributing the old 5% pathology)
      let wR, wP, wL;
      if (isTrial) {
        wR = 0.32; wP = 0.53; wL = 0.15; // was 0.30/0.55/0.15 + 5% redistributed to R/P
      } else if (intensity === "hard") {
        wR = 0.65; wP = 0.25; wL = 0.10; // was 0.60/0.25/0.10 + 5% → Recovery
      } else if (intensity === "solid") {
        wR = 0.48; wP = 0.37; wL = 0.15; // was 0.45/0.35/0.15 + 5% → R/P
      } else { // maintenance
        wR = 0.36; wP = 0.49; wL = 0.15; // was 0.35/0.45/0.15 + 5% → R/P
      }

      const partsAll = [];
      if (Recovery_block    != null) partsAll.push(wR * Recovery_block);
      if (Performance_block != null) partsAll.push(wP * Performance_block);
      if (Locomotion_block  != null) partsAll.push(wL * Locomotion_block);
      let Composite = partsAll.length ? partsAll.reduce((a,c)=>a+c,0) : null;

      // Recovery floor for non-trial hard efforts (still kept)
      const hardEffort = !isTrial && intensity === "hard";
      if (hardEffort && Recovery_block != null && Recovery_block < 0.30) {
        Composite = Math.min(Composite ?? 0, 0.60);
      }

      // Diagnostics for comments
      const __diag = {
        isTrial, intensity,
        poorRecovery: Recovery_block != null && Recovery_block < 0.4,
        strongPerf:   Performance_block != null && Performance_block >= 0.7,
        missingRecovery: Recovery_block == null,
      };

      scored.push({
        ...r,
        __group: groupKey,
        Recovery_block,
        Performance_block,
        Locomotion_block,
        Composite,
        HealthAlert,
        __diag,
      });
    }
  }

  // Robust scaling to /10 with p10–p90
  const comps = scored.map(r => r.Composite).filter(Number.isFinite);
  const p10 = percentile(comps, 0.10);
  const p90 = percentile(comps, 0.90);

  return scored.map(r => {
    if (!Number.isFinite(r.Composite) || !Number.isFinite(p10) || !Number.isFinite(p90) || p90 <= p10) {
      return {
        ...r,
        Score10: null,
        Phase: "Insufficient data",
        Color: "#888",
        Reason: "Need more similar sessions to rate fairly — metrics shown for reference.",
        HealthAlert: r.HealthAlert || null,
      };
    }

    const s01 = rnorm(r.Composite, p10, p90, false);
    const Score10 = +(s01 * 10).toFixed(1);

    const d = r.__diag || {};
    let Phase, Color, Reason;

    if (Score10 >= 9.0) {
      Phase = "Increase (Exceptional)"; Color = "rgb(0,176,80)";
      Reason = d.isTrial
        ? "Race‑like performance with appropriate recovery for a trial — horse coped easily; next workload can be raised."
        : "Handled the work too well — recovery strong; a small increase next time would be manageable.";
    } else if (Score10 >= 7.0) {
      Phase = "Optimal"; Color = "rgb(106,192,121)";
      Reason = d.isTrial
        ? "Strong trial performance; recovery acceptable for context."
        : "Strong performance with solid recovery — hold the program.";
    } else if (Score10 >= 5.0) {
      Phase = "Maintenance"; Color = "rgb(255,211,77)";
      Reason = "In line with a steady/maintenance gallop — no change unless aiming higher intensity.";
    } else if (Score10 >= 3.0) {
      Phase = "Monitor"; Color = "rgb(255,153,51)";
      Reason = d.missingRecovery
        ? "Below expected — key recovery data missing; monitor next session."
        : d.poorRecovery
          ? "Below expected — recovery slower for today’s effort; monitor workload."
          : "Below expected for context — monitor closely.";
    } else {
      Phase = "Investigate"; Color = "rgb(192,0,0)";
      Reason = d.isTrial
        ? "Under par for a trial (or slow recovery). Review horse/conditions before next start."
        : "Significant underperformance or slow recovery — investigate before next session.";
    }

    return { ...r, Score10, Phase, Color, Reason };
  });
}