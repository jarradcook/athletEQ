import React, { useState } from "react";

export default function HorseSelector({ horses, onSelectHorse }) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = searchTerm.trim()
    ? horses.filter((name) =>
        name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  return (
    <div
  style={{
    width: "100%",
    maxWidth: "400px",
    margin: "0 auto",
    marginTop: "20px",
    position: "relative",
  }}
>
      <input
        type="text"
        placeholder="Type a horse's name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          width: "100%",
          padding: "12px",
          fontSize: "1.1rem",
          borderRadius: "8px",
          border: "1px solid #ccc",
          outline: "none",
        }}
      />

      {filtered.length > 0 && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            backgroundColor: "#ffffff",
            borderRadius: "8px",
            marginTop: "0",
            boxShadow: "0 4px 8px rgba(31, 28, 28, 0.2)",
            maxHeight: "200px",
            overflowY: "auto",
            zIndex: 10,
          }}
        >
          {filtered.map((horse) => (
            <div
              key={horse}
              onClick={() => onSelectHorse(horse)}
              style={{
                padding: "10px 15px",
                cursor: "pointer",
                borderBottom: "1px solid #eee",
                backgroundColor: "#f1f4f8ff",
                color: "#051b31ff",
                fontWeight: "bold",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundColor = "#d6ecff")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundColor = "#f0f8ff")
              }
            >
              {horse}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}