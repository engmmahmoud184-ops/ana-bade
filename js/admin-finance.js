import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { auth } from "./auth.js";
import { db } from "./firebase.js";
import { getAllProviderRequestsAdmin } from "./services/provider-requests-service.js";
import { addReferralPayoutAdmin, getReferralPayoutsAdmin } from "./services/referral-payouts-service.js";

const $ = selector => document.querySelector(selector);
const make = (tag, className, text) => {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
};
const money = value => (Number(value) || 0).toLocaleString("en-US", { minimumFractionDigits:2, maximumFractionDigits:2 });
let currentAdmin = null;
let requests = [];
let payouts = [];

function dateLabel(value) {
  if (!value) return "—";
  const date = value.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("ar-LB", { dateStyle:"medium" }).format(date);
}

function info(label, value, className = "") {
  const box = make("div");
  box.append(make("span", null, label), make("strong", className, value || "—"));
  return box;
}

function approvedRequests() {
  return requests.filter(item => item.status === "approved");
}

function referralGroups() {
  const groups = new Map();
  const get = code => {
    const key = String(code || "").trim().toUpperCase();
    if (!key) return null;
    if (!groups.has(key)) groups.set(key, { code:key, requests:[], payouts:[] });
    return groups.get(key);
  };
  approvedRequests().forEach(item => { const group = get(item.referralCode); if (group) group.requests.push(item); });
  payouts.forEach(item => { const group = get(item.referralCode); if (group) group.payouts.push(item); });
  return [...groups.values()].sort((a, b) => a.code.localeCompare(b.code, "en"));
}

function renderSummary() {
  const approved = approvedRequests();
  const collected = approved.reduce((sum, item) => sum + (Number(item.amountReceivedUsd) || 0), 0);
  const paid = payouts.reduce((sum, item) => sum + (Number(item.amountUsd) || 0), 0);
  $("#collected-total").textContent = `${money(collected)} USD`;
  $("#collection-count").textContent = approved.filter(item => Number(item.amountReceivedUsd) > 0).length.toLocaleString("en-US");
  $("#payout-total").textContent = `${money(paid)} USD`;
  $("#referral-count").textContent = referralGroups().length.toLocaleString("en-US");
}

async function recordPayout(code) {
  const entered = prompt(`المبلغ المدفوع للمندوب ${code} بالدولار`, "");
  if (entered === null) return;
  const amountUsd = Number(String(entered).replace(",", "."));
  if (!Number.isFinite(amountUsd) || amountUsd <= 0) return alert("أدخل مبلغاً صحيحاً أكبر من صفر.");
  const note = prompt("ملاحظة أو رقم مرجع التحويل (اختياري)", "") ?? "";
  if (!confirm(`تسجيل دفعة ${money(amountUsd)} USD للمندوب ${code}؟`)) return;
  try {
    await addReferralPayoutAdmin({ referralCode:code, amountUsd, note, adminUid:currentAdmin.uid });
    await loadFinance();
  } catch (error) {
    console.error(error);
    alert(error?.message || "تعذر تسجيل الدفعة.");
  }
}

function renderReferrals() {
  const grid = $("#referrals-grid");
  grid.replaceChildren();
  const groups = referralGroups();
  if (!groups.length) return grid.append(make("div", "finance-empty providers-empty", "لا توجد رموز مندوبين مرتبطة بالتسجيلات بعد."));
  groups.forEach(group => {
    const collected = group.requests.reduce((sum, item) => sum + (Number(item.amountReceivedUsd) || 0), 0);
    const paid = group.payouts.reduce((sum, item) => sum + (Number(item.amountUsd) || 0), 0);
    const card = make("article", "referral-ledger-card");
    card.append(make("h3", null, group.code));
    const values = make("div", "ledger-values");
    values.append(
      info("التسجيلات", group.requests.length.toLocaleString("en-US")),
      info("المحصّل من تسجيلاته", `${money(collected)} USD`),
      info("المدفوع له", `${money(paid)} USD`),
      info("آخر دفعة", dateLabel(group.payouts[0]?.createdAt))
    );
    const pay = make("button", "secondary-button", "تسجيل دفعة للمندوب");
    pay.type = "button";
    pay.addEventListener("click", () => recordPayout(group.code));
    card.append(values, pay);
    grid.append(card);
  });
}

function renderCollections() {
  const term = $("#finance-search").value.trim().toLocaleLowerCase("ar");
  const items = approvedRequests().filter(item => `${item.name} ${item.paymentReference || ""} ${item.referralCode || ""} ${item.phone || ""}`.toLocaleLowerCase("ar").includes(term));
  const list = $("#collections-list");
  list.replaceChildren();
  $("#collections-count").textContent = `${items.length.toLocaleString("en-US")} سجل`;
  if (!items.length) return list.append(make("div", "finance-empty", "لا توجد تحصيلات مطابقة."));
  items.forEach(item => {
    const row = make("article", "finance-row");
    row.append(
      info("المسجّل", item.name),
      info("المبلغ المقبوض", `${money(item.amountReceivedUsd)} USD`, "finance-positive"),
      info("رمز المندوب", item.referralCode || "بدون مندوب"),
      info("رقم الطلب", item.paymentReference),
      info("تاريخ القبول", dateLabel(item.reviewedAt || item.createdAt))
    );
    list.append(row);
  });
}

function renderPayouts() {
  const list = $("#payouts-list");
  list.replaceChildren();
  $("#payouts-count").textContent = `${payouts.length.toLocaleString("en-US")} دفعة`;
  if (!payouts.length) return list.append(make("div", "finance-empty", "لم تُسجّل دفعات للمندوبين بعد."));
  payouts.forEach(item => {
    const row = make("article", "finance-row");
    row.append(
      info("رمز المندوب", item.referralCode),
      info("المبلغ المدفوع", `${money(item.amountUsd)} USD`, "finance-positive"),
      info("التاريخ", dateLabel(item.createdAt)),
      info("الملاحظة", item.note),
      info("سجّلها", item.adminUid)
    );
    list.append(row);
  });
}

async function loadFinance() {
  $("#collections-list").replaceChildren(make("div", "finance-empty", "جارٍ تحميل السجل المالي…"));
  try {
    [requests, payouts] = await Promise.all([getAllProviderRequestsAdmin(), getReferralPayoutsAdmin()]);
    renderSummary();
    renderReferrals();
    renderCollections();
    renderPayouts();
  } catch (error) {
    console.error(error);
    $("#collections-list").replaceChildren(make("div", "notice notice-error", "تعذر تحميل السجل المالي. تأكد من نشر قواعد Firestore الجديدة."));
  }
}

$("#finance-search").addEventListener("input", renderCollections);
$("#refresh-finance").addEventListener("click", loadFinance);
$("#logout").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async user => {
  const access = $("#access-card");
  const dashboard = $("#finance-dashboard");
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
    currentAdmin = user;
    access.classList.add("hidden");
    dashboard.classList.remove("hidden");
    $("#admin-email").textContent = user.email || "حساب إدارة";
    await loadFinance();
  } catch (error) {
    console.error(error);
    access.replaceChildren(make("p", null, "هذا الحساب لا يملك صلاحية الإدارة."));
    dashboard.classList.add("hidden");
    await signOut(auth);
  }
});
