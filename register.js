import { auth, db } from "./firebase.js";
import { 
  createUserWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import { 
  doc, setDoc 
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const registerForm = document.getElementById("registerForm");

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const firstName = document.getElementById("firstName").value.trim();
  const lastName = document.getElementById("lastName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPassword").value.trim();
  const role = document.getElementById("regRole").value;

  if (!role) {
    alert("Выберите роль");
    return;
  }

  if (!firstName || !lastName) {
    alert("Имя и фамилия обязательны для заполнения");
    return;
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Определяем статус верификации
    let verified = false;
    let companyVerified = false;
    
    if (role === "student") {
      verified = true;
    } else if (role === "employer") {
      verified = false;
      companyVerified = false;
    }

    // Сохраняем пользователя (никогда не создаем куратора через регистрацию)
    await setDoc(doc(db, "users", user.uid), {
      firstName,
      lastName,
      email,
      role,
      created_at: new Date(),
      university: "",
      course: "",
      speciality: "",
      phone: "",
      skills: [],
      portfolio: "",
      verified: verified,
      company_verified: companyVerified,
      registration_complete: true
    });

    // Если это работодатель, создаем запись о компании
    if (role === "employer") {
      await setDoc(doc(db, "companies", user.uid), {
        name: "",
        field: "",
        description: "",
        site: "",
        social: "",
        created_at: new Date(),
        owner_id: user.uid,
        owner_email: email,
        owner_name: `${firstName} ${lastName}`
      });
      console.log("Создана запись о компании для работодателя");
    }

    alert("Регистрация успешна!");

    // Редирект по роли
    if (role === "employer") {
      window.location.href = "employer.html";
    } else {
      window.location.href = "index.html";
    }

  } catch (err) {
    console.error("Ошибка регистрации:", err);
    alert("Ошибка: " + err.message);
  }
});