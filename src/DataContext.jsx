// src/DataContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { db, auth } from "./firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";

const DataContext = createContext();

export function DataProvider({ children }) {
  const [data, setData] = useState([]);      // horse sessions from Firestore
  const [ready, setReady] = useState(false); // UI knows when loading is done
  const [user, setUser] = useState(null);    // Firebase auth user
  const [claims, setClaims] = useState(null); // custom claims (admin flag, etc.)

  // Watch authentication state
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const tokenRes = await u.getIdTokenResult(true); // refresh to get claims
        setClaims(tokenRes.claims || {});
      } else {
        setClaims(null);
      }
    });
    return () => unsub();
  }, []);

  // Subscribe to Firestore sessions
  useEffect(() => {
    const q = query(collection(db, "sessions"), orderBy("date", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const rows = [];
        snap.forEach((doc) => rows.push({ id: doc.id, ...doc.data() }));
        setData(rows);
        setReady(true);
      },
      (err) => {
        console.error("Firestore error:", err);
        setReady(true);
      }
    );
    return () => unsub();
  }, []);

  return (
    <DataContext.Provider value={{ data, ready, user, claims }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  return useContext(DataContext);
}