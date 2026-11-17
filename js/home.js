import { db } from "./firebase.js";
import { collection, doc, getDocs, query, runTransaction, serverTimestamp, where } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { getAllActiveTowns } from "./services/towns-service.js";
import { townIdVariants } from "./services/providers-service.js";

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
  await loadRegionCounts(snapshot.docs.map(item => ({ id: item.id, ...item.data() })));
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
