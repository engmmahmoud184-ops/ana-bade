import { collection, doc, getDocs, serverTimestamp, setDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";
import { createUserWithEmailAndPassword, deleteUser, getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import { db } from "../firebase.js";
import { firebaseConfig } from "../firebase-config.js";

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

export async function createReferralAccountAdmin({ name, referralCode, email, password }) {
  const cleanName = String(name || "").trim();
  const cleanCode = String(referralCode || "").trim().toUpperCase();
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanName || !cleanCode || !cleanEmail || String(password || "").length < 6) throw new Error("أكمل الاسم والرمز والبريد وكلمة مرور من 6 أحرف على الأقل.");
  const secondaryApp = initializeApp(firebaseConfig, `referral-creator-${Date.now()}`);
  let credential = null;
  try {
    credential = await createUserWithEmailAndPassword(getAuth(secondaryApp), cleanEmail, password);
    await setDoc(doc(db, "referralAccounts", credential.user.uid), { name:cleanName, referralCode:cleanCode, email:cleanEmail, isActive:true, createdAt:serverTimestamp(), updatedAt:serverTimestamp() });
    return credential.user.uid;
  } catch (error) {
    if (credential?.user) try { await deleteUser(credential.user); } catch (cleanupError) { console.error("Referral user cleanup failed", cleanupError); }
    throw error;
  } finally { await deleteApp(secondaryApp); }
}
