// Utilities to parse Equimetre exports in the browser

export function timeToSeconds(val) {
  if (val == null) return null;
  if (typeof val === 'number') return val; // already numeric seconds
  const s = String(val).trim();
  if (!s) return null;

  // Already a decimal number?
  if (/^-?\d+(\.\d+)?$/.test(s)) return parseFloat(s);

  // Handle HH:MM:SS(.s), MM:SS(.s)
  const parts = s.split(':').map(p => p.trim());
  const fix = (x) => parseFloat(String(x).replace(',', '.'));

  if (parts.length === 3) {
    const [hh, mm, ss] = parts;
    const fss = fix(ss);
    if (isNaN(fss)) return null;
    return (+hh * 3600) + (+mm * 60) + fss;
  }
  if (parts.length === 2) {
    const [mm, ss] = parts;
    const fss = fix(ss);
    if (isNaN(fss)) return null;
    return (+mm * 60) + fss;
  }
  return null;
}

export function toNumber(val) {
  if (val == null || val === '') return null;
  if (typeof val === 'number') return val;
  const s = String(val).replace('%', '').replace(',', '.').trim();
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

// Normalize headers: collapse spaces, trim
export function normalizeHeader(h) {
  if (!h) return h;
  return String(h).replace(/\s+/g, ' ').trim();
}

// Optional canonical rename so your code can rely on stable names
const CANONICAL = {
  'Fast Recovery in % of max HR': 'Fast Recovery % MaxHR',
  'HR after 15 min in % of max HR': 'HR15_pct',
  'Max Speed': 'Max Speed',
  'Time last 800m': 'Time last 800m',
  'Time last 600m': 'Time last 600m',
  'Time last 400m': 'Time last 400m',
  'Time last 200m': 'Time last 200m',
  // Preserve vendor’s trailing spaces on these (don’t “fix” them here):
  'Time to 65 % of the max HR ': 'Time to 65 % of the max HR ',
  'Time to 60 % of the max HR ': 'Time to 60 % of the max HR ',
  'Time to 55 % of the max HR ': 'Time to 55 % of the max HR ',
  'Time to 50 % of the max HR ': 'Time to 50 % of the max HR ',
  'Time to 45 % of the max HR ': 'Time to 45 % of the max HR ',
  'Time to 40 % of the max HR ': 'Time to 40 % of the max HR ',
  'Acidose': 'Acidose',
  'Working Duration': 'Working Duration',
  'Highest measured acceleration': 'Highest measured acceleration',
  'Heart rate after 1 min': 'Heart rate after 1 min',
  'Heart rate after 3 min': 'Heart rate after 3 min',
  'Training type': 'Training type',
  'Track condition': 'Track condition',
  'Date': 'Date',
  'Horse': 'Horse',
};

const TIME_COLUMNS = new Set([
  'Time last 800m',
  'Time last 600m',
  'Time last 400m',
  'Time last 200m',
  'Time to 65 % of the max HR ',
  'Time to 60 % of the max HR ',
  'Time to 55 % of the max HR ',
  'Time to 50 % of the max HR ',
  'Time to 45 % of the max HR ',
  'Time to 40 % of the max HR ',
  'Acidose',
  'Working Duration',
]);

const NUM_COLUMNS = new Set([
  'Fast Recovery % MaxHR',
  'HR15_pct',
  'Max Speed',
  'Highest measured acceleration',
  'Heart rate after 1 min',
  'Heart rate after 3 min',
]);

export function cleanHeaders(headers) {
  return headers.map(h => {
    const norm = normalizeHeader(h);
    return CANONICAL[norm] ?? norm;
  });
}

export function cleanRow(row, headers) {
  const cleaned = {};
  headers.forEach((h) => {
    const v = row[h];
    if (TIME_COLUMNS.has(h)) {
      cleaned[h] = timeToSeconds(v);
    } else if (NUM_COLUMNS.has(h)) {
      cleaned[h] = toNumber(v);
    } else {
      // gentle numeric coercion
      if (typeof v === 'string' && v.match(/^ *-?\d+([.,]\d+)? *%?$/)) {
        cleaned[h] = toNumber(v);
      } else {
        cleaned[h] = v ?? null;
      }
    }
  });
  return cleaned;
}