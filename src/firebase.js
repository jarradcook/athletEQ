// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBZPOXwGUp4eSPopcZwj_TM2VmUBcChqWc",
  authDomain: "athletes-7e6a3.firebaseapp.com",
  projectId: "athletes-7e6a3",
  storageBucket: "athletes-7e6a3.firebasestorage.app",
  messagingSenderId: "1010997648929",
  appId: "1:1010997648929:web:1edbd3e7610956269b4d60"
};

const app = initializeApp(firebaseConfig);

// 👇 export this so the rest of the app can use Firebase Auth
export const auth = getAuth(app);