import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ================= ПРОВЕРКА РОЛИ =================
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "login.html";
    return;
  }

  const userDoc = await getDoc(doc(db, "users", user.uid));

  if (!userDoc.exists()) {
    alert("Ошибка: нет данных пользователя");
    return;
  }

  const role = userDoc.data().role;
  const page = window.location.pathname;

  if (page.includes("student") && role !== "student") {
    window.location.href = "index.html";
  }

  if (page.includes("employer") && role !== "employer") {
    window.location.href = "index.html";
  }

  if (page.includes("curator") && role !== "curator") {
    window.location.href = "index.html";
  }
});

// ================= КНОПКИ (ГЛОБАЛЬНО) =================
window.logout = async function () {
  try {
    await signOut(auth);
    window.location.href = "index.html";
  } catch (e) {
    console.error(e);
    alert("Ошибка при выходе");
  }
};

window.goHome = function () {
  window.location.href = "index.html";
};