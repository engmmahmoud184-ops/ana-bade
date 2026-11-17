import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { auth } from "./auth.js";
import { db } from "./firebase.js";
import { getAllProviderRequestsAdmin } from "./services/provider-requests-service.js";

const $ = selector => document.querySelector(selector);
const make = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
const money = value => (Number(value) || 0).toLocaleString("en-US", { minimumFractionDigits:2, maximumFractionDigits:2 });
let collections = [];

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

function dateLabel(value) {
  if (!value) return "—";
  const date = value.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("ar-LB", { dateStyle:"medium", timeStyle:"short" }).format(date);
}

function info(label, value, className = "") {
  const box = make("div");
  box.append(make("span", null, label), make("strong", className, value || "—"));
  return box;
}

function updateSummary() {
  const paid = collections.filter(item => item.paymentStatus === "paid");
  const waived = collections.filter(item => item.paymentStatus === "waived");
  const total = collections.reduce((sum, item) => sum + (Number(item.amountReceivedUsd) || 0), 0);
  const paidWithAmount = paid.filter(item => Number(item.amountReceivedUsd) > 0);
  const average = paidWithAmount.length ? total / paidWithAmount.length : 0;
  $("#received-total").textContent = `${money(total)} USD`;
  $("#paid-count").textContent = paid.length.toLocaleString("en-US");
  $("#waived-count").textContent = waived.length.toLocaleString("en-US");
  $("#average-total").textContent = `${money(average)} USD`;
}

function filteredCollections() {
  const tokens = normalize($("#collections-search").value).split(" ").filter(Boolean);
  const payment = $("#payment-filter").value;
  const referral = $("#referral-filter").value;
  return collections.filter(item => {
    const haystack = normalize(`${item.name} ${item.phone || ""} ${item.paymentReference || ""} ${item.paymentDescription || ""} ${item.referralCode || ""}`);
    if (!tokens.every(token => haystack.includes(token))) return false;
    if (payment !== "all" && item.paymentStatus !== payment) return false;
    const hasReferral = Boolean(String(item.referralCode || "").trim());
    if (referral === "with" && !hasReferral) return false;
    if (referral === "without" && hasReferral) return false;
    return true;
  });
}

function renderCollections() {
  const items = filteredCollections();
  const ledger = $("#collections-ledger");
  ledger.replaceChildren();
  $("#collections-result-count").textContent = `عرض ${items.length.toLocaleString("en-US")} من أصل ${collections.length.toLocaleString("en-US")} موافقة`;
  if (!items.length) return ledger.append(make("div", "finance-empty", "لا توجد مبالغ مطابقة للبحث والفلاتر."));
  items.forEach(item => {
    const card = make("article", "collection-card");
    const name = make("div", "collection-name");
    name.append(make("strong", null, item.name || "مقدم خدمة"), make("small", null, item.phone || "لا يوجد هاتف"));
    const status = item.paymentStatus === "waived" ? "إعفاء" : "مدفوع";
    card.append(
      name,
      info("المبلغ المقبوض", `${money(item.amountReceivedUsd)} USD`, "collection-amount"),
      info("نوع الموافقة", status),
      info("رمز المندوب", item.referralCode || "بدون مندوب"),
      info("التاريخ ورقم الطلب", `${dateLabel(item.reviewedAt || item.createdAt)} · ${item.paymentReference || "—"}`)
    );
    ledger.append(card);
  });
}

async function loadCollections() {
  $("#collections-ledger").replaceChildren(make("div", "finance-empty", "جارٍ تحميل المقبوضات…"));
  try {
    const requests = await getAllProviderRequestsAdmin();
    collections = requests.filter(item => item.status === "approved");
    updateSummary();
    renderCollections();
  } catch (error) {
    console.error(error);
    $("#collections-ledger").replaceChildren(make("div", "notice notice-error", "تعذر تحميل المبالغ المقبوضة."));
  }
}

[$("#collections-search"), $("#payment-filter"), $("#referral-filter")].forEach(element => element.addEventListener("input", renderCollections));
$("#clear-collection-filters").addEventListener("click", () => {
  $("#collections-search").value = "";
  $("#payment-filter").value = "all";
  $("#referral-filter").value = "all";
  renderCollections();
});
$("#refresh-collections").addEventListener("click", loadCollections);
$("#logout").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async user => {
  const access = $("#access-card");
  const dashboard = $("#collections-dashboard");
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
    await loadCollections();
  } catch (error) {
    console.error(error);
    access.replaceChildren(make("p", null, "هذا الحساب لا يملك صلاحية الإدارة."));
    dashboard.classList.add("hidden");
    await signOut(auth);
  }
});
