import { addDoc, collection, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { db } from "../firebase.js";

export async function getReferralPayoutsAdmin() {
  const snapshot = await getDocs(collection(db, "referralPayouts"));
  return snapshot.docs.map(item => ({ id:item.id, ...item.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}

export function addReferralPayoutAdmin({ referralCode, amountUsd, note, adminUid }) {
  const amount = Number(amountUsd);
  if (!referralCode?.trim()) throw new Error("رمز المندوب مطلوب.");
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) throw new Error("المبلغ غير صالح.");
  return addDoc(collection(db, "referralPayouts"), {
    referralCode:referralCode.trim().toUpperCase(),
    amountUsd:amount,
    note:String(note || "").trim().slice(0, 300),
    adminUid,
    createdAt:serverTimestamp()
  });
}
