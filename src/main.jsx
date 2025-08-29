// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { DataProvider } from "./DataContext.jsx";
import AuthGate from "./AuthGate.jsx";
import App from "./App.jsx";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthGate>
        <DataProvider>
          <Routes>
            {/* Wildcard so App.jsx can handle /, /horse/:horseName, /admin/upload, etc. */}
            <Route path="/*" element={<App />} />
          </Routes>
        </DataProvider>
      </AuthGate>
    </BrowserRouter>
  </React.StrictMode>
);