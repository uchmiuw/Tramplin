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
let currentItem = null;
let itemId = null;
let isFavorite = false;
let map = null;

function getItemIdFromUrl() {
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

function getTypeText(type) {
    if (type === "internship") return "Стажировка";
    if (type === "event") return "Мероприятие";
    return "Вакансия";
}

function getTypeClass(type) {
    if (type === "internship") return "type-internship";
    if (type === "event") return "type-event";
    return "type-vacancy";
}

async function loadItemDetails() {
    itemId = getItemIdFromUrl();
    
    if (!itemId) {
        console.error("ID не указан");
        document.getElementById("itemTitle").textContent = "Ошибка: ID не указан";
        return;
    }
    
    try {
        console.log("Загрузка с ID:", itemId);
        
        const itemDoc = await getDoc(doc(db, "opportunity", itemId));
        
        if (!itemDoc.exists()) {
            console.error("Запись не найдена");
            document.getElementById("itemTitle").textContent = "Запись не найдена";
            return;
        }
        
        currentItem = { id: itemDoc.id, ...itemDoc.data() };
        console.log("Загружено:", currentItem.title);
        
        let companyName = "Организатор";
        if (currentItem.company_id) {
            try {
                const companyDoc = await getDoc(doc(db, "companies", currentItem.company_id));
                if (companyDoc.exists()) {
                    companyName = companyDoc.data().name;
                }
            } catch (e) {
                console.log("Ошибка загрузки организатора:", e);
            }
        }
        
        const titleEl = document.getElementById("itemTitle");
        const companyEl = document.getElementById("itemCompany");
        if (titleEl) titleEl.textContent = currentItem.title || "Без названия";
        if (companyEl) companyEl.textContent = companyName;
        
        const typeBadge = document.getElementById("typeBadge");
        if (typeBadge) {
            typeBadge.textContent = getTypeText(currentItem.type);
            typeBadge.className = `type-badge ${getTypeClass(currentItem.type)}`;
        }
        
        const salaryEl = document.getElementById("itemSalary");
        if (salaryEl) {
            salaryEl.textContent = currentItem.salary ? `${currentItem.salary.toLocaleString()} ₽` : "Не указано";
        }
        
        const formatEl = document.getElementById("itemFormat");
        if (formatEl) {
            formatEl.textContent = currentItem.format || "Не указан";
        }
        
        let addressText = "Адрес не указан";
        if (currentItem.formatted_address) {
            addressText = currentItem.formatted_address;
        } else if (currentItem.city) {
            addressText = currentItem.city;
            if (currentItem.street) addressText += `, ${currentItem.street}`;
            if (currentItem.house) addressText += `, ${currentItem.house}`;
        }
        const addressEl = document.getElementById("itemAddress");
        if (addressEl) addressEl.textContent = addressText;
        
        const formattedDate = formatDate(currentItem.created_at);
        const dateEl = document.getElementById("itemDate");
        if (dateEl) {
            dateEl.textContent = formattedDate ? `Добавлено: ${formattedDate}` : "Дата не указана";
        }

        const endDateEl = document.getElementById("itemEndDate");
        if (endDateEl) {
            endDateEl.textContent = currentItem.end_date ? (formatDate(currentItem.end_date) || "—") : "—";
        }
        
        // Новые поля для занятости и уровня
        const workHoursEl = document.getElementById("itemWorkHours");
        if (workHoursEl) {
            workHoursEl.textContent = currentItem.work_hours ? `${currentItem.work_hours} ч/день` : "Не указано";
        }
        
        const levelEl = document.getElementById("itemLevel");
        if (levelEl) {
            levelEl.textContent = currentItem.level || "Не указан";
        }
        
        const descEl = document.getElementById("itemDescription");
        if (descEl) {
            descEl.textContent = currentItem.description || "Описание отсутствует";
        }
        
        const skillsEl = document.getElementById("itemSkills");
        if (skillsEl) {
            if (currentItem.tags && currentItem.tags.length > 0) {
                skillsEl.innerHTML = currentItem.tags.map(tag => 
                    `<span class="skill-tag">${escapeHtml(tag)}</span>`
                ).join('');
            } else {
                skillsEl.innerHTML = '<span style="color: #999;">Навыки не указаны</span>';
            }
        }
        
        const specialFields = document.getElementById("specialFields");
        const specialContent = document.getElementById("specialContent");
        
        if (currentItem.type === "internship") {
            specialFields.style.display = "block";
            specialContent.innerHTML = `
                <div class="info-row">
                    <div class="info-label">Длительность:</div>
                    <div class="info-value">${currentItem.duration || "Не указана"}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Наставник:</div>
                    <div class="info-value">${currentItem.mentor || "Не указан"}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Требования:</div>
                    <div class="info-value">${currentItem.requirements || "Не указаны"}</div>
                </div>
            `;
        } else if (currentItem.type === "event") {
            specialFields.style.display = "block";
            let startDate = currentItem.start_date ? formatDate(currentItem.start_date) : "Не указана";
            let endDate = currentItem.end_date ? formatDate(currentItem.end_date) : "";
            
            specialContent.innerHTML = `
                <div class="info-row">
                    <div class="info-label">Дата проведения:</div>
                    <div class="info-value">${startDate}${endDate ? ` - ${endDate}` : ""}</div>
                </div>
                <div class="info-row">
                    <div class="info-label">Время:</div>
                    <div class="info-value">
                        ${(currentItem.start_time && currentItem.end_time) ? `${currentItem.start_time} - ${currentItem.end_time}` : (currentItem.start_time || "Не указано")}
                    </div>
                </div>
                <div class="info-row">
                    <div class="info-label">Спикер(ы):</div>
                    <div class="info-value">${currentItem.speaker || "Не указан(ы)"}</div>
                </div>
            `;
        } else {
            specialFields.style.display = "none";
        }
        
        if (currentItem.map && currentItem.map.latitude && currentItem.map.longitude) {
            initDetailMap(currentItem.map.latitude, currentItem.map.longitude, addressText);
        } else {
            const mapContainer = document.getElementById("detail-map");
            if (mapContainer) {
                mapContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">Адрес не указан или не удалось определить координаты</div>';
            }
        }
        
        checkIfFavorite();
        
    } catch (error) {
        console.error("Ошибка загрузки:", error);
        const titleEl = document.getElementById("itemTitle");
        if (titleEl) titleEl.textContent = "Ошибка загрузки";
        const descEl = document.getElementById("itemDescription");
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
        marker.bindPopup(`<b>${currentItem?.title || "Запись"}</b><br>${address || ""}`).openPopup();
        
    } catch (error) {
        console.error("Ошибка инициализации карты:", error);
        if (mapContainer) {
            mapContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: #999;">Ошибка загрузки карты</div>';
        }
    }
}

function checkIfFavorite() {
    const favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    isFavorite = favorites.includes(itemId);
    
    const favoriteBtn = document.getElementById("favoriteBtn");
    if (favoriteBtn) {
        favoriteBtn.innerHTML = isFavorite ? "В избранном" : "В избранное";
        favoriteBtn.style.background = isFavorite ? "#dc3545" : "#6c757d";
    }
}

window.toggleFavorite = async function() {
    let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
    
    if (isFavorite) {
        favorites = favorites.filter(id => id !== itemId);
        alert("Удалено из избранного");
    } else {
        favorites.push(itemId);
        alert("Добавлено в избранное");
    }
    
    localStorage.setItem("favorites", JSON.stringify(favorites));
    isFavorite = !isFavorite;
    
    const favoriteBtn = document.getElementById("favoriteBtn");
    if (favoriteBtn) {
        favoriteBtn.innerHTML = isFavorite ? "В избранном" : "В избранное";
        favoriteBtn.style.background = isFavorite ? "#dc3545" : "#6c757d";
    }
};

window.applyForItem = async function() {
    if (!currentUser) {
        alert("Для отклика необходимо войти в аккаунт");
        window.location.href = "login.html";
        return;
    }
    
    const userDoc = await getDoc(doc(db, "users", currentUser.uid));
    if (!userDoc.exists()) {
        alert("Ошибка: данные пользователя не найдены");
        return;
    }
    
    if (userDoc.data().role !== "student") {
        alert("Откликаться могут только студенты");
        return;
    }
    
    const existingQuery = query(
        collection(db, "applications"),
        where("user_id", "==", currentUser.uid),
        where("opportunity_id", "==", itemId)
    );
    const existing = await getDocs(existingQuery);
    
    if (!existing.empty) {
        alert("Вы уже откликались на эту запись");
        return;
    }
    
    try {
        const studentData = userDoc.data();
        
        await addDoc(collection(db, "applications"), {
            user_id: currentUser.uid,
            opportunity_id: itemId,
            opportunity_title: currentItem.title,
            opportunity_type: currentItem.type,
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
    console.log("DOM загружен, инициализация страницы");
    
    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        console.log("Пользователь:", user ? user.email : "не авторизован");
        
        const cabinetBtn = document.getElementById("cabinetBtn");
        if (cabinetBtn) {
            cabinetBtn.style.display = user ? "inline-block" : "none";
        }
        
        await loadItemDetails();
    });
});