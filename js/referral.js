import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { auth } from "./auth.js";
import { db } from "./firebase.js";

const $ = selector => document.querySelector(selector);
const make = (tag, className, text) => { const element = document.createElement(tag); if (className) element.className = className; if (text !== undefined) element.textContent = text; return element; };
const money = value => (Number(value) || 0).toLocaleString("en-US", { minimumFractionDigits:2, maximumFractionDigits:2 });
let account = null;
let registrations = [];
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

function statusLabel(status) {
  return ({ approved:"مقبول", pending:"بانتظار المراجعة", rejected:"مرفوض" })[status] || status || "—";
}

function renderRegistrations() {
  const term = $("#referral-search").value.trim().toLocaleLowerCase("ar");
  const items = registrations.filter(item => `${item.name || ""} ${statusLabel(item.status)}`.toLocaleLowerCase("ar").includes(term));
  const list = $("#referral-registrations");
  list.replaceChildren();
  $("#referral-results-count").textContent = `${items.length.toLocaleString("en-US")} تسجيل`;
  if (!items.length) return list.append(make("div", "finance-empty", term ? "لا توجد نتائج مطابقة." : "لم يسجّل أحد على رمزك بعد."));
  items.forEach(item => {
    const row = make("article", "finance-row");
    row.append(info("الاسم أو البزنس", item.name), info("الحالة", statusLabel(item.status)), info("تاريخ التسجيل", dateLabel(item.createdAt)), info("تاريخ القرار", dateLabel(item.reviewedAt)));
    list.append(row);
  });
}

function renderPayouts() {
  const list = $("#referral-payouts");
  list.replaceChildren();
  $("#referral-payouts-count").textContent = `${payouts.length.toLocaleString("en-US")} دفعة`;
  if (!payouts.length) return list.append(make("div", "finance-empty", "لا توجد دفعات مسجلة لك بعد."));
  payouts.forEach(item => {
    const row = make("article", "finance-row");
    row.append(info("المبلغ", `${money(item.amountUsd)} USD`, "finance-positive"), info("التاريخ", dateLabel(item.createdAt)), info("الملاحظة", item.note));
    list.append(row);
  });
}

async function loadReferralData() {
  const code = account.referralCode;
  const [requestSnapshot, payoutSnapshot] = await Promise.all([
    getDocs(query(collection(db, "providerRequests"), where("referralCode", "==", code))),
    getDocs(query(collection(db, "referralPayouts"), where("referralCode", "==", code)))
  ]);
  registrations = requestSnapshot.docs.map(item => ({ id:item.id, ...item.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  payouts = payoutSnapshot.docs.map(item => ({ id:item.id, ...item.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  $("#referral-registrations-count").textContent = registrations.length.toLocaleString("en-US");
  $("#referral-approved-count").textContent = registrations.filter(item => item.status === "approved").length.toLocaleString("en-US");
  $("#referral-pending-count").textContent = registrations.filter(item => item.status === "pending").length.toLocaleString("en-US");
  $("#referral-paid-total").textContent = `${money(payouts.reduce((sum, item) => sum + Number(item.amountUsd || 0), 0))} USD`;
  renderRegistrations();
  renderPayouts();
}

$("#referral-login").addEventListener("submit", async event => {
  event.preventDefault();
  $("#referral-login-status").textContent = "جارٍ تسجيل الدخول…";
  try { await signInWithEmailAndPassword(auth, $("#referral-email").value, $("#referral-password").value); }
  catch (error) { console.error(error); $("#referral-login-status").textContent = "البريد أو كلمة المرور غير صحيحة."; }
});
$("#referral-search").addEventListener("input", renderRegistrations);
$("#refresh-referral").addEventListener("click", loadReferralData);
$("#referral-logout").addEventListener("click", () => signOut(auth));

onAuthStateChanged(auth, async user => {
  if (!user) { account = null; $("#referral-dashboard").classList.add("hidden"); $("#referral-login").classList.remove("hidden"); return; }
  try {
    const snapshot = await getDoc(doc(db, "referralAccounts", user.uid));
    if (!snapshot.exists() || snapshot.data().isActive !== true) throw new Error("No referral access");
    account = snapshot.data();
    $("#referral-name").textContent = account.name || user.email || "حساب مندوب";
    $("#referral-code").textContent = account.referralCode;
    $("#referral-login").classList.add("hidden");
    $("#referral-dashboard").classList.remove("hidden");
    await loadReferralData();
  } catch (error) {
    console.error(error);
    $("#referral-login-status").textContent = "هذا الحساب غير مربوط بمندوب فعّال.";
    await signOut(auth);
  }
});
