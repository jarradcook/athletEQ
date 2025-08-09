function checkUnderperformance(row, expectedStrideLength) {
  const underperformance = [];
  const positive = [];

  // --- Fast Recovery Quality (Arioneo: lower = better) ---
  const fastRecovery = parseFloat(row['Fast Recovery in % of max HR']);
  if (!isNaN(fastRecovery)) {
    if (fastRecovery > 65) {
      underperformance.push({
        severity: 'red',
        message: `Fast Recovery above target: ${fastRecovery}% (Target < 60%) – indicates high intensity of effort felt`,
      });
    } else if (fastRecovery > 60) {
      underperformance.push({
        severity: 'orange',
        message: `Fast Recovery slightly high: ${fastRecovery}% (Target < 60%)`,
      });
    } else {
      positive.push({
        severity: 'green',
        message: `Fast Recovery within target: ${fastRecovery}% (< 60%) – low intensity of effort felt`,
      });
    }
  }

  // --- HR after 15 min (% of max HR) ---
  const hr15 = parseFloat(row['HR after 15 min in % of max HR']);
  if (!isNaN(hr15)) {
    if (hr15 > 50) {
      underperformance.push({
        severity: 'red',
        message: `HR after 15 min still high: ${hr15}% (Target < 45%)`,
      });
    } else if (hr15 > 45) {
      underperformance.push({
        severity: 'orange',
        message: `HR after 15 min slightly elevated: ${hr15}% (Target < 45%)`,
      });
    } else {
      positive.push({
        severity: 'green',
        message: `HR after 15 min within target: ${hr15}% (< 45%)`,
      });
    }
  }

  // --- Stride Length at 60 km/h ---
  const stride = parseFloat(row['Stride length at 60 km/h']);
  const expected = parseFloat(expectedStrideLength);
  if (!isNaN(stride) && !isNaN(expected)) {
    const diff = stride - expected;
    const absDiff = Math.abs(diff);

    if (absDiff < 0.2) {
      positive.push({
        severity: 'green',
        message: `Stride Length at 60 km/h within expected range: ${stride}m (Expected: ${expected}m)`,
      });
    } else if (diff < -0.4) {
      underperformance.push({
        severity: 'red',
        message: `Stride Length below expected: ${stride}m (Expected: ${expected}m)`,
      });
    } else if (diff < -0.35) {
      underperformance.push({
        severity: 'orange',
        message: `Stride Length slightly below expected: ${stride}m (Expected: ${expected}m)`,
      });
    } else if (diff < -0.2) {
      underperformance.push({
        severity: 'yellow',
        message: `Stride Length marginally below expected: ${stride}m (Expected: ${expected}m)`,
      });
    } else if (diff > 0.2) {
      positive.push({
        severity: 'green',
        message: `Stride Length exceeds expected: ${stride}m (Expected: ${expected}m)`,
      });
    }
  }

  return { underperformance, positive };
}

export default checkUnderperformance;