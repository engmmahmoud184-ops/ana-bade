import { collection, doc, getDocs, serverTimestamp, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { db } from "../firebase.js";

export async function getReferralAccountsAdmin() {
  const snapshot = await getDocs(collection(db, "referralAccounts"));
  return snapshot.docs.map(item => ({ uid:item.id, ...item.data() }));
}

export function saveReferralAccountAdmin({ uid, name, referralCode }) {
  const cleanUid = String(uid || "").trim();
  const cleanCode = String(referralCode || "").trim().toUpperCase();
  if (!cleanUid || !cleanCode) throw new Error("UID ورمز المندوب مطلوبان.");
  return setDoc(doc(db, "referralAccounts", cleanUid), { name:String(name || "").trim(), referralCode:cleanCode, isActive:true, updatedAt:serverTimestamp() }, { merge:true });
}

export function setReferralAccountActiveAdmin(uid, isActive) {
  return updateDoc(doc(db, "referralAccounts", uid), { isActive, updatedAt:serverTimestamp() });
}
