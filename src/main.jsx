import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App.jsx";
import HorsePage from "./components/HorsePage.jsx";
import { DataProvider } from "./DataContext.jsx";
import AuthGate from "./AuthGate.jsx";   // ⬅️ add this
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthGate>                       {/* ⬅️ gate everything */}
        <DataProvider>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/horse/:horseName" element={<HorsePage />} />
          </Routes>
        </DataProvider>
      </AuthGate>
    </BrowserRouter>
  </React.StrictMode>
);