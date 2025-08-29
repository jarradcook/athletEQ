// src/pages/AdminUpload.jsx  (or src/components/AdminUpload.jsx based on your import)
import React, { useState } from "react";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from "firebase/firestore";

/* ========= Helpers ========= */
const normSpace = (s) =>
  String(s || "")
    .normalize("NFKC")
    .replace(/\u00A0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const normLower = (s) => normSpace(s).toLowerCase();

// Parse DD/MM/YYYY or DD-MM-YYYY, optional HH:MM
function parseDateLoose(raw) {
  if (!raw) return null;
  const s = normSpace(raw);
  const m = s.match(
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2}))?$/
  );
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
}
const toTimestamp = (raw) => {
  const d = parseDateLoose(raw);
  return d ? Timestamp.fromDate(d) : null;
};

// Stable doc ID so re-uploads upsert instead of duplicate
function makeDocId(r) {
  const horse = normLower(r.Horse || r["Horse name"] || r["Horse Name"] || "");
  const dateRaw = r.Date || r["Session date"] || r["Session Date"] || r.date || "";
  const track = normLower(r["Track name"] || r["Track"] || "");
  const type = normLower(r["Training type"] || r["Type"] || "");

  const d = parseDateLoose(dateRaw);
  const iso = d
    ? new Date(d.getTime() - d.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16) // YYYY-MM-DDTHH:MM
    : normLower(dateRaw);

  const raw = [horse, iso, track, type].filter(Boolean).join("__");
  return raw.replace(/[^a-z0-9._-]+/gi, "_").slice(0, 700);
}

/* ========= Component ========= */
export default function AdminUpload() {
  const navigate = useNavigate();
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState("");
  const [fileName, setFileName] = useState("");

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    try {
      setStatus("Reading file…");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: null, raw: false });

      // Sort newest first (optional, for nicer progress)
      const withSort = json
        .map((r) => {
          const rawDate =
            r.Date || r["Session date"] || r["Session Date"] || r.date || "";
          const d = parseDateLoose(rawDate);
          return { ...r, __t: d ? d.getTime() : -Infinity };
        })
        .sort((a, b) => b.__t - a.__t);

      setRows(withSort);
      setStatus(`Parsed ${withSort.length} rows from ${file.name}`);
    } catch (err) {
      console.error(err);
      setStatus(`❌ Failed to parse: ${err.message}`);
    }
  };

  const upload = async () => {
    if (!rows.length) {
      setStatus("No rows to upload.");
      return;
    }

    try {
      const col = collection(db, "sessions");
      const CHUNK = 400;
      const total = rows.length;
      let done = 0;
      let newCount = 0;
      let updatedCount = 0;

      for (let i = 0; i < total; i += CHUNK) {
        const batch = writeBatch(db);
        const slice = rows.slice(i, i + CHUNK);

        for (const r of slice) {
          const dateRaw =
            r.Date || r["Session date"] || r["Session Date"] || r.date || "";
          const id = makeDocId(r);
          const ref = doc(col, id);

          // Count new vs updated (read-before-write)
          const snap = await getDoc(ref);
          if (snap.exists()) updatedCount += 1;
          else newCount += 1;

          batch.set(
            ref,
            {
              ...r, // flatten original columns
              Date: dateRaw || r.Date || null, // keep original visible string
              date: toTimestamp(dateRaw), // ✅ real Timestamp for DataContext orderBy("date","desc")
              _docId: id,
              _horseNorm: normLower(r.Horse || r["Horse name"] || r["Horse Name"] || ""),
              _trackNorm: normLower(r["Track name"] || r["Track"] || ""),
              _uploadedAt: serverTimestamp(),
              _sourceFile: fileName || null,
            },
            { merge: true } // upsert
          );
        }

        await batch.commit();
        done = Math.min(done + slice.length, total);
        setStatus(`Uploading… ${done}/${total} sessions processed`);
      }

      setStatus(
        `✅ Upload complete. New: ${newCount} · Updated: ${updatedCount} · Total processed: ${total}\nReturning to dashboard…`
      );

      // ✅ Automatically go back to home so you can pick a horse
      setTimeout(() => navigate("/"), 600);

      // Clear local state
      setRows([]);
      setFileName("");
    } catch (err) {
      console.error(err);
      setStatus(`❌ Upload failed: ${err.message}`);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Admin Upload</h2>
        <button
          onClick={() => navigate("/")}
          style={{
            background: "transparent",
            color: "#0c3050ff",
            border: "1px solid #0c3050ff",
            padding: "6px 10px",
            borderRadius: 6,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          ← Go to Dashboard
        </button>
      </div>

      <p style={{ marginTop: 8 }}>
        Upload the full Arioneo <code>.xlsx</code> export. We automatically <strong>upsert</strong> each session
        (no duplicates). After upload, you’ll return to the dashboard to select a horse.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
        <input type="file" accept=".xlsx" onChange={handleFile} />
        <button
          onClick={upload}
          disabled={!rows.length}
          style={{
            background: "#0c3050ff",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            padding: "8px 14px",
            fontWeight: 700,
            cursor: rows.length ? "pointer" : "not-allowed",
          }}
        >
          Upload to Firestore
        </button>
      </div>

      <div style={{ fontSize: 13, opacity: 0.85, marginBottom: 6 }}>
        {rows.length ? `${rows.length} sessions ready from "${fileName}".` : "No file loaded yet."}
      </div>

      {status && (
        <div
          style={{
            marginTop: 8,
            padding: 10,
            borderRadius: 8,
            background: "#f5f7fb",
            border: "1px solid #e5e8f0",
            fontSize: 13,
            whiteSpace: "pre-wrap",
          }}
        >
          {status}
        </div>
      )}
    </div>
  );
}