import React, { useRef } from "react";

export default function SplashScreen({ onFileUpload }) {
  const fileInputRef = useRef();

  const handleClick = () => {
    fileInputRef.current.click();
  };

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
          background: "#fff",
          padding: "40px",
          borderRadius: "16px",
          boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
          width: "100%",
          maxWidth: 480,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "20px",
        }}
      >
        <img
          src="/athleteq-logo.png"
          alt="AthletEQ Logo"
          style={{ width: 280 }}
        />

        <p style={{ fontSize: "1rem", color: "#333" }}>
          Upload Horse Performance data
        </p>

        <input
          type="file"
          accept=".xlsx, .xls"
          ref={fileInputRef}
          onChange={onFileUpload}
          style={{ display: "none" }}
        />

        <button
          onClick={handleClick}
          style={{
            backgroundColor: "#11436e",
            color: "#fff",
            padding: "12px 24px",
            fontSize: "1rem",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontWeight: "bold",
            width: "100%",
            maxWidth: 360,
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "#0d3557")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "#11436e")
          }
        >
          📁 Select File
        </button>
      </div>
    </div>
  );
}