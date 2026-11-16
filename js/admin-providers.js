import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { auth } from "./auth.js";
import { db } from "./firebase.js";
import { getAllCategoriesAdmin, getAllProvidersAdmin, getAllRegionsAdmin, getAllTownsAdmin, updateProviderAdmin } from "./services/admin-data-service.js";

const $ = selector => document.querySelector(selector);
const make = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};

let providers = [];
let regions = [];
let towns = [];
let categories = [];
let regionById = new Map();
let townById = new Map();
let categoryById = new Map();

function normalize(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[إأآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .toLocaleLowerCase("ar")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function providerSearchText(item) {
  const region = regionById.get(item.regionId);
  const town = townById.get(item.townId);
  const category = categoryById.get(item.categoryId);
  return normalize([
    item.name, item.phone, item.whatsapp, item.address, item.description,
    region?.nameAr, region?.nameEn, town?.nameAr, town?.nameEn,
    category?.nameAr, category?.nameEn, item.referralCode
  ].filter(Boolean).join(" "));
}

function matchesSearch(item, term) {
  const tokens = normalize(term).split(" ").filter(Boolean);
  const haystack = providerSearchText(item);
  return tokens.every(token => haystack.includes(token));
}

function formatDate(value) {
  if (!value) return "—";
  const date = value.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("ar-LB", { dateStyle:"medium" }).format(date);
}

function metaRow(label, value) {
  const row = make("div");
  row.append(make("span", null, label), make("strong", null, value || "—"));
  return row;
}

function actionButton(label, className, handler) {
  const button = make("button", className, label);
  button.type = "button";
  button.addEventListener("click", handler);
  return button;
}

function updateSummary() {
  $("#total-count").textContent = providers.length.toLocaleString("en-US");
  $("#active-count").textContent = providers.filter(item => item.isActive).length.toLocaleString("en-US");
  $("#inactive-count").textContent = providers.filter(item => !item.isActive).length.toLocaleString("en-US");
  const received = providers.reduce((total, item) => total + (Number(item.amountReceivedUsd) || 0), 0);
  $("#received-total").textContent = received.toLocaleString("en-US", { minimumFractionDigits:2, maximumFractionDigits:2 });
}

function filteredProviders() {
  const term = $("#provider-search").value;
  const status = $("#status-filter").value;
  const regionId = $("#region-filter").value;
  const categoryId = $("#category-filter").value;
  return providers.filter(item => {
    if (!matchesSearch(item, term)) return false;
    if (status === "active" && !item.isActive) return false;
    if (status === "inactive" && item.isActive) return false;
    if (status === "verified" && !item.isVerified) return false;
    if (regionId !== "all" && item.regionId !== regionId) return false;
    if (categoryId !== "all" && item.categoryId !== categoryId) return false;
    return true;
  });
}

function renderProviders() {
  const items = filteredProviders();
  const grid = $("#providers-grid");
  grid.replaceChildren();
  $("#results-count").textContent = `عرض ${items.length.toLocaleString("en-US")} من أصل ${providers.length.toLocaleString("en-US")} مسجّل`;
  if (!items.length) {
    grid.append(make("div", "notice providers-empty", "لا توجد نتائج مطابقة للبحث والفلاتر."));
    return;
  }
  items.forEach(item => {
    const card = make("article", "registered-card");
    const head = make("div", "registered-card-head");
    const avatar = make("div", "registered-avatar", (item.name || "خ").trim().charAt(0));
    if (item.imageUrl) { avatar.style.backgroundImage = `url(${JSON.stringify(item.imageUrl)})`; avatar.textContent = ""; }
    const title = make("div", "registered-title");
    const badges = make("div", "item-badges");
    badges.append(make("span", item.isActive ? "active-pill" : "inactive-pill", item.isActive ? "فعّال" : "معطّل"));
    if (item.isVerified) badges.append(make("span", "verified-badge", "موثّق"));
    title.append(make("h2", null, item.name || "مقدم خدمة"), make("p", null, `${townById.get(item.townId)?.nameAr || "بلدة غير محددة"} · ${categoryById.get(item.categoryId)?.nameAr || "فئة غير محددة"}`), badges);
    head.append(avatar, title);
    const meta = make("div", "registered-meta");
    meta.append(
      metaRow("الهاتف", item.phone),
      metaRow("المنطقة", regionById.get(item.regionId)?.nameAr),
      metaRow("العنوان", item.address),
      metaRow("المبلغ المقبوض", `${(Number(item.amountReceivedUsd) || 0).toFixed(2)} USD`),
      metaRow("انتهاء الاشتراك", formatDate(item.listingExpiresAt))
    );
    const actions = make("div", "registered-actions");
    const profileLink = make("a", null, "عرض البروفايل");
    profileLink.href = `provider.html?id=${encodeURIComponent(item.id)}`;
    profileLink.target = "_blank";
    profileLink.rel = "noopener";
    actions.append(
      profileLink,
      actionButton("تعديل", "plain-button", () => editProvider(item)),
      actionButton(item.isVerified ? "إلغاء التوثيق" : "توثيق", "plain-button", () => toggleProvider(item, "isVerified")),
      actionButton(item.isActive ? "تعطيل" : "تفعيل", `${item.isActive ? "danger-button" : "secondary-button"} wide-action`, () => toggleProvider(item, "isActive"))
    );
    card.append(head, meta, actions);
    grid.append(card);
  });
}

async function toggleProvider(item, key) {
  const next = !item[key];
  const label = key === "isActive" ? (next ? "تفعيل" : "تعطيل") : (next ? "توثيق" : "إلغاء توثيق");
  if (!confirm(`هل تريد ${label} ${item.name}؟`)) return;
  try {
    await updateProviderAdmin(item.id, { [key]:next });
    item[key] = next;
    updateSummary();
    renderProviders();
  } catch (error) {
    console.error(error);
    alert("تعذر حفظ التغيير.");
  }
}

async function editProvider(item) {
  const name = prompt("اسم مقدم الخدمة", item.name || "");
  if (name === null || !name.trim()) return;
  const phone = prompt("رقم الهاتف", item.phone || "");
  if (phone === null) return;
  const address = prompt("العنوان", item.address || "");
  if (address === null) return;
  const amount = prompt("المبلغ المقبوض بالدولار", String(Number(item.amountReceivedUsd) || 0));
  if (amount === null) return;
  const amountReceivedUsd = Number(String(amount).replace(",", "."));
  if (!Number.isFinite(amountReceivedUsd) || amountReceivedUsd < 0) return alert("المبلغ غير صالح.");
  try {
    const changes = { name:name.trim(), phone:phone.trim(), address:address.trim(), amountReceivedUsd };
    await updateProviderAdmin(item.id, changes);
    Object.assign(item, changes);
    providers.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ar"));
    updateSummary();
    renderProviders();
  } catch (error) {
    console.error(error);
    alert("تعذر تعديل السجل.");
  }
}

function fillSelect(select, items, label) {
  select.replaceChildren(new Option(label, "all"));
  items.forEach(item => select.add(new Option(item.nameAr || item.nameEn || item.id, item.id)));
}

async function loadProviders() {
  $("#providers-grid").replaceChildren(make("div", "notice providers-empty", "جارٍ تحميل المسجّلين…"));
  try {
    [providers, regions, towns, categories] = await Promise.all([
      getAllProvidersAdmin(), getAllRegionsAdmin(), getAllTownsAdmin(), getAllCategoriesAdmin()
    ]);
    regionById = new Map(regions.map(item => [item.id, item]));
    townById = new Map(towns.map(item => [item.id, item]));
    categoryById = new Map(categories.map(item => [item.id, item]));
    fillSelect($("#region-filter"), regions, "كل المناطق");
    fillSelect($("#category-filter"), categories, "كل الفئات");
    updateSummary();
    renderProviders();
  } catch (error) {
    console.error(error);
    $("#providers-grid").replaceChildren(make("div", "notice notice-error providers-empty", "تعذر تحميل المسجّلين."));
  }
}

[$("#provider-search"), $("#status-filter"), $("#region-filter"), $("#category-filter")].forEach(element => element.addEventListener("input", renderProviders));
$("#clear-filters").addEventListener("click", () => {
  $("#provider-search").value = "";
  $("#status-filter").value = "all";
  $("#region-filter").value = "all";
  $("#category-filter").value = "all";
  renderProviders();
});
$("#refresh-providers").addEventListener("click", loadProviders);
$("#logout").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async user => {
  const access = $("#access-card");
  const dashboard = $("#providers-dashboard");
  if (!user) {
    access.replaceChildren(make("p", null, "يجب تسجيل الدخول من لوحة الإدارة أولاً."));
    const link = make("a", "primary-button", "الذهاب إلى تسجيل الدخول");
    link.href = "admin.html";
    access.append(link);
    dashboard.classList.add("hidden");
    return;
  }
  try {
    const admin = await getDoc(doc(db, "admins", user.uid));
    if (!admin.exists() || admin.data().isActive !== true) throw new Error("Not admin");
    access.classList.add("hidden");
    dashboard.classList.remove("hidden");
    $("#admin-email").textContent = user.email || "حساب إدارة";
    await loadProviders();
  } catch (error) {
    console.error(error);
    access.replaceChildren(make("p", null, "هذا الحساب لا يملك صلاحية الإدارة."));
    dashboard.classList.add("hidden");
    await signOut(auth);
  }
});
