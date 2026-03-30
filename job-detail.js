import { db, auth } from "./firebase.js";
import { 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    addDoc, 
    deleteDoc,
    query,
    where
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

import { 
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

let currentUser = null;
let currentJob = null;
let jobId = null;
let isFavorite = false;
let map = null;

function getJobIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

function formatDate(dateValue) {
    if (!dateValue) return null;
    
    try {
        let date;
        
        if (typeof dateValue === 'object' && dateValue !== null && 'seconds' in dateValue) {
            date = new Date(dateValue.seconds * 1000);
        }
        else if (typeof dateValue === 'string') {
            date = new Date(dateValue);
        }
        else if (dateValue instanceof Date) {
            date = dateValue;
        }
        else if (typeof dateValue === 'number') {
            date = new Date(dateValue);
        }
        else {
            return null;
        }
        
        if (isNaN(date.getTime())) {
            return null;
        }
        
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        
        return `${day}.${month}.${year}`;
    } catch (e) {
        return null;
    }
}

async function loadJobDetails() {
    jobId = getJobIdFromUrl();
    
    if (!jobId) {
        console.error("ID вакансии не указан");
        document.getElementById("jobTitle").textContent = "Ошибка: ID вакансии не указан";
        return;
    }
    
    try {
        console.log("Загрузка вакансии с ID:", jobId);
        
        const jobDoc = await getDoc(doc(db, "opportunity", jobId));
        
        if (!jobDoc.exists()) {
            console.error("Вакансия не найдена");
            document.getElementById("jobTitle").textContent = "Вакансия не найдена";
            return;
        }
        
        currentJob = { id: jobDoc.id, ...jobDoc.data() };
        console.log("Вакансия загружена:", currentJob.title);
        
        let companyName = "Компания";
        if (currentJob.company_id) {
            try {
                const companyDoc = await getDoc(doc(db, "companies", currentJob.company_id));
                if (companyDoc.exists()) {
                    companyName = companyDoc.data().name;
                }
            } catch (e) {
                console.log("Ошибка загрузки компании:", e);
            }
        }
        
        const titleEl = document.getElementById("jobTitle");
        const companyEl = document.getElementById("jobCompany");
        if (titleEl) titleEl.textContent = currentJob.title || "Без названия";
        if (companyEl) companyEl.textContent = companyName;
        
        const salaryEl = document.getElementById("jobSalary");
        if (salaryEl) {
            salaryEl.textContent = currentJob.salary ? `${currentJob.salary.toLocaleString()} ₽` : "Не указана";
        }
        
        const formatEl = document.getElementById("jobFormat");
        if (formatEl) {
            formatEl.textContent = currentJob.format || "Не указан";
        }
        
        let addressText = "Адрес не указан";
        if (currentJob.formatted_address) {
            addressText = currentJob.formatted_address;
        } else if (currentJob.city) {
            addressText = currentJob.city;
            if (currentJob.street) addressText += `, ${currentJob.street}`;
            if (currentJob.house) addressText += `, ${currentJob.house}`;
        }
        const addressEl = document.getElementById("jobAddress");
        if (addressEl) addressEl.textContent = addressText;
        
        const formattedDate = formatDate(currentJob.created_at);
        const dateEl = document.getElementById("jobDate");
        if (dateEl) {
            dateEl.textContent = formattedDate ? `Добавлено: ${formattedDate}` : "Дата не указана";
        }

        const endDateEl = document.getElementById("jobEndDate");
        if (endDateEl) {
            endDateEl.textContent = currentJob.end_date ? (formatDate(currentJob.end_date) || "—") : "—";
        }
        
        const descEl = document.getElementById("jobDescription");
        if (descEl) {
            descEl.textContent = currentJob.description || "Описание отсутствует";
        }
        
        const skillsEl = document.getElementById("jobSkills");
        if (skillsEl) {
            if (currentJob.tags && currentJob.tags.length > 0) {
                skillsEl.innerHTML = currentJob.tags.map(tag => 
                    `<span class="skill-tag">${escapeHtml(tag)}</span>`
                ).join('');
            } else {
                skillsEl.innerHTML = '<span style="color: #999;">Навыки не указаны</span>';
            }
        }
        
        if (currentJob.map && currentJob.map.latitude && currentJob.map.longitude) {
            initDetailMap(currentJob.map.latitude, currentJob.map.longitude, addressText);
        } else {
            const mapContainer = document.getElementById("detail-map");
            if (mapContainer) {
                mapContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">Адрес не указан или не удалось определить координаты</div>';
            }
        }
        
        checkIfFavorite();
        
    } catch (error) {
        console.error("Ошибка загрузки вакансии:", error);
        const titleEl = document.getElementById("jobTitle");
        if (titleEl) titleEl.textContent = "Ошибка загрузки вакансии";
        const descEl = document.getElementById("jobDescription");
        if (descEl) {
            descEl.textContent = `Не удалось загрузить данные: ${error.message}`;
        }
    }
}

function initDetailMap(lat, lng, address) {
    if (map) return;
    
    const mapContainer = document.getElementById("detail-map");
    if (!mapContainer) return;
    
    try {
        if (typeof L === 'undefined') {
            console.error("Leaflet не загружен");
            mapContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">Загрузка карты...</div>';
            return;
        }
        
        map = L.map('detail-map').setView([lat, lng], 15);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { 
            attribution: '© OpenStreetMap' 
        }).addTo(map);
        
        const marker = L.marker([lat, lng]).addTo(map);
        marker.bindPopup(`<b>${currentJob?.title || "Вакансия"}</b><br>${address || ""}`).openPopup();
        
    } catch (error) {
        console.error("Ошибка инициализации карты:", error);
        if (mapContainer) {
            mapContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">Ошибка загрузки карты</div>';
        }
    }
}

function checkIfFavorite() {
    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    isFavorite = favorites.includes(jobId);
    
    const favoriteBtn = document.getElementById("favoriteBtn");
    if (favoriteBtn) {
        favoriteBtn.innerHTML = isFavorite ? "❤️ В избранном" : "🤍 В избранное";
        favoriteBtn.style.background = isFavorite ? "#dc3545" : "#6c757d";
    }
}

window.toggleFavorite = async function() {
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    
    if (isFavorite) {
        favorites = favorites.filter(id => id !== jobId);
        alert("Вакансия удалена из избранного");
    } else {
        favorites.push(jobId);
        alert("Вакансия добавлена в избранное");
    }
    
    localStorage.setItem("favorites", JSON.stringify(favorites));
    isFavorite = !isFavorite;
    
    const favoriteBtn = document.getElementById("favoriteBtn");
    if (favoriteBtn) {
        favoriteBtn.innerHTML = isFavorite ? "❤️ В избранном" : "🤍 В избранное";
        favoriteBtn.style.background = isFavorite ? "#dc3545" : "#6c757d";
    }
};

window.applyForJob = async function() {
    if (!currentUser) {
        alert("Для отклика на вакансию необходимо войти в аккаунт");
        window.location.href = "login.html";
        return;
    }
    
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (!userDoc.exists()) {
        alert("Ошибка: данные пользователя не найдены");
        return;
    }
    
    if (userDoc.data().role !== "student") {
        alert("Откликаться на вакансии могут только студенты");
        return;
    }
    
    const existingQuery = query(
        collection(db, "applications"),
        where("user_id", "==", currentUser.uid),
        where("opportunity_id", "==", jobId)
    );
    const existing = await getDocs(existingQuery);
    
    if (!existing.empty) {
        alert("Вы уже откликались на эту вакансию");
        return;
    }
    
    try {
        const studentData = userDoc.data();
        
        await addDoc(collection(db, "applications"), {
            user_id: currentUser.uid,
            opportunity_id: jobId,
            opportunity_title: currentJob.title,
            status: "pending",
            applied_at: new Date(),
            student_data: {
                firstName: studentData.firstName,
                lastName: studentData.lastName,
                email: studentData.email,
                phone: studentData.phone || "",
                university: studentData.university || "",
                course: studentData.course || "",
                speciality: studentData.speciality || "",
                skills: studentData.skills || [],
                portfolio: studentData.portfolio || ""
            }
        });
        
        alert("Отклик успешно отправлен");
        
        const applyBtn = document.getElementById("applyBtn");
        if (applyBtn) {
            applyBtn.textContent = "Отклик отправлен";
            applyBtn.disabled = true;
            applyBtn.style.opacity = "0.6";
            applyBtn.style.cursor = "not-allowed";
        }
        
    } catch (error) {
        console.error("Ошибка отправки отклика:", error);
        alert("Ошибка при отправке отклика: " + error.message);
    }
};

window.goToCabinet = async function() {
    if (!currentUser) {
        window.location.href = "login.html";
        return;
    }
    
    try {
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
            const role = userDoc.data().role;
            if (role === "employer") {
                window.location.href = "employer.html";
            } else if (role === "curator") {
                window.location.href = "curator.html";
            } else {
                window.location.href = "student.html";
            }
        } else {
            window.location.href = "index.html";
        }
    } catch (error) {
        console.error("Ошибка перехода в кабинет:", error);
        window.location.href = "index.html";
    }
};

window.logout = async function() {
    try {
        await signOut(auth);
        window.location.href = "index.html";
    } catch (error) {
        console.error("Ошибка выхода:", error);
        alert("Ошибка при выходе");
    }
};

function escapeHtml(text) {
    if (!text) return text;
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM загружен, инициализация страницы вакансии");
    
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        console.log("Пользователь:", user ? user.email : "не авторизован");
        
        const cabinetBtn = document.getElementById("cabinetBtn");
        if (cabinetBtn) {
            cabinetBtn.style.display = user ? "inline-block" : "none";
        }
        
        await loadJobDetails();
    });
});