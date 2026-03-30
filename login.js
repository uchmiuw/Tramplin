import { auth, db } from "./firebase.js";
import { 
  signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import { 
  doc, getDoc 
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const loginForm = document.getElementById("loginForm");

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Получаем роль
    const userDoc = await getDoc(doc(db, "users", user.uid));

    if (!userDoc.exists()) {
      alert("Пользователь не найден в базе");
      return;
    }

    const data = userDoc.data();
    const role = data.role;

    // Редирект по роли
    if (role === "employer") {
      window.location.href = "employer.html";
    } else if (role === "curator") {
      window.location.href = "curator.html";
    } else {
      window.location.href = "index.html";
    }

  } catch (err) {
    alert("Ошибка: " + err.message);
  }
});