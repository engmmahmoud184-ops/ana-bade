import { getActiveRegions } from "./services/regions-service.js";
import { showNotice } from "./ui.js";
import { db } from "./firebase.js";
import { collection, doc, getDocs, query, runTransaction, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const container = document.querySelector("#regions");
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
      link.href = `towns.html?region=${encodeURIComponent(region.id)}`;
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

loadStats();
loadRegions();
