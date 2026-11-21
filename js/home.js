import { db } from "./firebase.js";
import { collection, doc, getDocs, query, runTransaction, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { getAllActiveTowns } from "./services/towns-service.js";
import { getAllActiveSpecialties } from "./services/specialties-service.js";
import { townIdVariants } from "./services/providers-service.js";

const providersStat = document.querySelector("#providers-stat");
const visitsStat = document.querySelector("#visits-stat");
const searchExamples = document.querySelector("#search-examples");
const numberFormatter = new Intl.NumberFormat("en-US", { useGrouping: true });
const isEnglish = () => window.AnaBadeI18n?.language() === "en";
const localizedName = item => window.AnaBadeI18n?.name(item) || item?.nameAr || item?.nameEn || "";

function westernNumber(value) {
  return numberFormatter.format(Number(value) || 0).replace(/[٠-٩]/g, digit => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(digit)]);
}

async function loadProviderCount() {
  const activeProviders = query(collection(db, "providers"), where("isActive", "==", true));
  const snapshot = await getDocs(activeProviders);
  const providers = snapshot.docs.map(item => ({ id:item.id, ...item.data() }));
  providersStat.textContent = westernNumber(snapshot.size);
  await Promise.all([loadRegionCounts(providers), loadPopularExamples(providers)]);
}

async function loadPopularExamples(providers) {
  const [towns, specialties] = await Promise.all([getAllActiveTowns(), getAllActiveSpecialties()]);
  const townByVariant = new Map(towns.flatMap(town => townIdVariants(town).map(id => [id, town])));
  const specialtyById = new Map(specialties.map(item => [item.id, item]));
  const combinations = new Map();
  providers.forEach(provider => {
    const town = townByVariant.get(provider.townId);
    if (!town) return;
    (provider.specialtyIds || []).forEach(specialtyId => {
      const specialty = specialtyById.get(specialtyId);
      if (!specialty) return;
      const key = `${town.id}::${specialtyId}`;
      const current = combinations.get(key) || { town, specialty, categoryId:provider.categoryId, count:0 };
      current.count += 1;
      combinations.set(key, current);
    });
  });
  const examples = [...combinations.values()].sort((a, b) => b.count - a.count || localizedName(a.specialty).localeCompare(localizedName(b.specialty), isEnglish() ? "en" : "ar")).slice(0, 4);
  if (!examples.length) return;
  searchExamples.replaceChildren();
  const label = document.createElement("span");
  label.textContent = isEnglish() ? "Try:" : "جرّب:";
  searchExamples.append(label);
  examples.forEach(({ town, specialty, categoryId, count }) => {
    const link = document.createElement("a");
    link.href = `providers.html?town=${encodeURIComponent(town.id)}&category=${encodeURIComponent(categoryId)}&specialty=${encodeURIComponent(specialty.id)}`;
    link.textContent = isEnglish() ? `${localizedName(specialty)} in ${localizedName(town)}` : `${localizedName(specialty)} في ${localizedName(town)}`;
    const badge = document.createElement("b");
    badge.className = "example-count";
    badge.textContent = westernNumber(count);
    link.append(badge);
    searchExamples.append(link);
  });
}

async function loadRegionCounts(providers) {
  const categoryId = new URLSearchParams(location.search).get("category");
  const towns = await getAllActiveTowns();
  const townRegions = new Map(towns.flatMap(town => townIdVariants(town).map(id => [id, town.regionId])));
  const counts = providers.reduce((result, provider) => {
    if (categoryId && provider.categoryId !== categoryId) return result;
    const regionId = provider.regionId || townRegions.get(provider.townId);
    if (regionId) result[regionId] = (result[regionId] || 0) + 1;
    return result;
  }, {});
  document.querySelectorAll("#regions a[data-region]").forEach(link => {
    const badge = document.createElement("b");
    badge.className = "provider-count-badge";
    badge.textContent = `${westernNumber(counts[link.dataset.region] || 0)} مسجّل`;
    link.querySelector("span:nth-child(2)").append(badge);
  });
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

loadStats();
