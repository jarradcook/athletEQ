import React from "react";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";
import { useData } from "./DataContext";
import SplashScreen from "./SplashScreen.jsx";
import HorseSelector from "./components/HorseSelector.jsx";

export default function App() {
  const { data, setData } = useData();
  const navigate = useNavigate();

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      const binaryData = new Uint8Array(e.target.result);
      const workbook = XLSX.read(binaryData, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet);
      setData(json);
    };

    reader.readAsArrayBuffer(file);
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
      const rawDate =
        row["Date"] || row["date"] || row["Timestamp"] || row["timestamp"];
      if (!rawDate) return false;

      const normalizedDateStr = rawDate.replace(
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

  if (data.length === 0) {
    return <SplashScreen onFileUpload={handleFileUpload} />;
  }

  return (
    <div
      style={{
        backgroundColor: "#0c3050ff",
        height: "100vh",
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
}