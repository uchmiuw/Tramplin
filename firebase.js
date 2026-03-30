// firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

// Настройки проекта
const firebaseConfig = {
  apiKey: "AIzaSyDd6s1x5R3uYEi1ZSh4BSyHi9tqUqsyx_k",
  authDomain: "itplanet-a7217.firebaseapp.com",
  projectId: "itplanet-a7217",
  storageBucket: "itplanet-a7217.firebasestorage.app",
  messagingSenderId: "98301044641",
  appId: "1:98301044641:web:33e32d919b5007fcf7cde0",
  measurementId: "G-LPZYJ692M2"
};

// Инициализация
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);