// Pretty-print seconds as MM:SS.cc (centiseconds) for sectional tiles
export function formatSecondsMMSScc(secs) {
  if (secs == null || Number.isNaN(secs)) return '—';
  const total = Number(secs);
  const whole = Math.floor(total);
  const centis = Math.round((total - whole) * 100); // hundredths
  const mm = Math.floor(whole / 60);
  const ss = whole % 60;
  return `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}.${String(centis).padStart(2,'0')}`;
}