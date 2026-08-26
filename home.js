import { getActiveRegions } from "./services/regions-service.js";
import { getActiveCategories } from "./services/categories-service.js";
import { showNotice } from "./ui.js";
import { db } from "./firebase.js";
import { collection, doc, getDocs, query, runTransaction, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const container = document.querySelector("#regions");
const categoriesContainer = document.querySelector("#main-categories");
const pageParams = new URLSearchParams(location.search);
const selectedCategoryId = pageParams.get("category");
const providersStat = document.querySelector("#providers-stat");
const visitsStat = document.querySelector("#visits-stat");
const numberFormatter = new Intl.NumberFormat("en-US", { useGrouping: true });

function westernNumber(value) {
  return numberFormatter.format(Number(value) || 0).replace(/[٠-٩]/g, digit => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(digit)]);
}

async function loadProviderCount() {
  const activeProviders = query(collection(db, "providers"), where("isActive", "==", true));
  const snapshot = await getDocs(activeProviders);
  providersStat.textContent = westernNumber(snapshot.size);
}

async function loadAndRegisterVisit() {
  const statsDocument = doc(db, "publicStats", "main");
  const total = await runTransaction(db, async transaction => {
    const current = await transaction.get(statsDocument);
    if (!current.exists()) {
      transaction.set(statsDocument, { visits: 1, updatedAt: serverTimestamp() });
      return 1;
    }
    const next = Number(current.data().visits || 0) + 1;
    transaction.set(statsDocument, { visits: next, updatedAt: serverTimestamp() });
    return next;
  });
  visitsStat.textContent = westernNumber(total);
}

async function loadStats() {
  try { await loadProviderCount(); } catch (error) { console.error("Provider count failed", error); providersStat.textContent = "—"; }
  try { await loadAndRegisterVisit(); } catch (error) { console.error("Visit counter failed", error); visitsStat.textContent = "—"; }
}

async function loadRegions() {
  try {
    const regions = await getActiveRegions();
    container.innerHTML = "";
    if (!regions.length) { showNotice(container, "لا توجد مناطق متاحة حالياً.", "أضف مناطق فعّالة من لوحة الإدارة."); return; }
    regions.forEach((region, index) => {
      const link = document.createElement("a");
      link.className = "region-card";
      const categoryPart = selectedCategoryId ? `&category=${encodeURIComponent(selectedCategoryId)}` : "";
      link.href = `towns.html?region=${encodeURIComponent(region.id)}${categoryPart}`;
      link.setAttribute("aria-label", `اختيار ${region.nameAr}`);
      link.innerHTML = `<span class="region-number">${String(index + 1).padStart(2, "0")}</span><span><strong></strong><small lang="en" dir="ltr"></small></span><span class="arrow" aria-hidden="true">←</span>`;
      link.querySelector("strong").textContent = region.nameAr;
      link.querySelector("small").textContent = region.nameEn || "";
      container.append(link);
    });
  } catch (error) {
    console.error(error);
    showNotice(container, "تعذر تحميل المناطق.", "تحقق من اتصال الإنترنت وإعدادات Firebase.", true);
  } finally { container.setAttribute("aria-busy", "false"); }
}

const categoryIcons = {"food-restaurants":"🍽️","health-medical":"🩺","construction-workshops":"🛠️","cars-vehicles":"🚗","beauty-care":"✂️","shopping-retail":"🛍️","education-training":"🎓","technology-electronics":"💻","agriculture-animals":"🌿","professional-services":"💼","home-services":"🏠","events-entertainment":"🎉"};

async function loadCategories() {
  try {
    const categories = await getActiveCategories();
    categoriesContainer.replaceChildren();
    categoriesContainer.removeAttribute("aria-busy");
    if (!categories.length) { showNotice(categoriesContainer, "لا توجد فئات متاحة حالياً.", "ستظهر الفئات الفعالة هنا تلقائياً."); return; }
    categories.forEach(category => {
      const link = document.createElement("a");
      link.href = `index.html?category=${encodeURIComponent(category.id)}#regions-title`;
      if (category.id === selectedCategoryId) link.classList.add("selected-category-card");
      link.innerHTML = `<span aria-hidden="true">${categoryIcons[category.id] || "📍"}</span><strong></strong><small lang="en" dir="ltr"></small>`;
      const english = window.AnaBadeI18n?.language() === "en";
      link.querySelector("strong").textContent = english ? (category.nameEn || category.nameAr || category.id) : (category.nameAr || category.nameEn || category.id);
      link.querySelector("small").textContent = english ? (category.nameAr || "Local services") : (category.nameEn || "Local services");
      categoriesContainer.append(link);
    });
  } catch (error) {
    console.error("Category loading failed", error);
    showNotice(categoriesContainer, "تعذر تحميل الفئات.", "تحقق من الاتصال وإعدادات Firebase.", true);
  }
}

loadStats();
loadCategories();
loadRegions();
