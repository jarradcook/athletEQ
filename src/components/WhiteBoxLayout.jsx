// src/components/WhiteBoxLayout.jsx
import React from "react";

export default function WhiteBoxLayout({ children }) {
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
          gap: "20px",
        }}
      >
        <img
          src="/athleteq-logo.png"
          alt="AthletEQ Logo"
          style={{ width: 280 }}
        />
        {children}
      </div>
    </div>
  );
}