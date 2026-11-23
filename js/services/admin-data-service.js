import { addDoc, collection, doc, getDocs, serverTimestamp, setDoc, Timestamp, updateDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { db } from "../firebase.js";

const sortArabic = (items, field="nameAr") => items.sort((a,b)=>(a[field]||"").localeCompare(b[field]||"","ar"));
const allDocs = async name => (await getDocs(collection(db,name))).docs.map(item=>({id:item.id,...item.data()}));

export async function getAllProvidersAdmin(){ return sortArabic(await allDocs("providers"),"name"); }
export async function getAllRegionsAdmin(){ return sortArabic(await allDocs("regions")); }
export async function getAllTownsAdmin(){ return sortArabic(await allDocs("towns")); }
export async function getAllCategoriesAdmin(){ return sortArabic(await allDocs("categories")); }

export function updateProviderAdmin(id,data){ return updateDoc(doc(db,"providers",id),{...data,updatedAt:serverTimestamp()}); }
export function updateRegionAdmin(id,data){ return updateDoc(doc(db,"regions",id),data); }
export function updateTownAdmin(id,data){ return updateDoc(doc(db,"towns",id),data); }

export function addRegionAdmin(data){ return addDoc(collection(db,"regions"),{nameAr:data.nameAr.trim(),nameEn:data.nameEn.trim(),isActive:true,createdAt:serverTimestamp()}); }
export function addTownAdmin(data){ return addDoc(collection(db,"towns"),{nameAr:data.nameAr.trim(),nameEn:data.nameEn.trim(),legacyKey:data.nameEn.trim(),regionId:data.regionId,isActive:true,createdAt:serverTimestamp()}); }

export async function addAlMarjTestRestaurantsAdmin() {
  const expiresAt = Timestamp.fromDate(new Date("2099-12-31T23:59:59Z"));
  const base = {
    regionId:"albekaa", townId:"albekaa__al-marj", categoryId:"food-restaurants",
    phone:"00000000", whatsapp:"", address:"المرج — بيانات تجريبية",
    googleMapsUrl:"", websiteUrl:"", email:"", facebookUrl:"", instagramUrl:"", youtubeUrl:"", tiktokUrl:"",
    referralCode:"", imageUrl:"", imagePath:"", isActive:true, isVerified:false,
    billingMode:"test", feeUsd:0, amountReceivedUsd:0, listingExpiresAt:expiresAt,
    isTestData:true, updatedAt:serverTimestamp()
  };
  const restaurants = [
    { id:"test-almarj-fish-restaurant", name:"مطعم السمك التجريبي", specialtyIds:["restaurant"], providedItems:["سمك","مأكولات بحرية"], description:"سجل تجريبي لاختبار البحث عن السمك في المرج." },
    { id:"test-almarj-chicken-restaurant", name:"فروج المرج التجريبي", specialtyIds:["fast-food"], providedItems:["فروج","دجاج مشوي"], description:"سجل تجريبي لاختبار البحث عن الفروج في المرج." },
    { id:"test-almarj-burger-restaurant", name:"برغر المرج التجريبي", specialtyIds:["fast-food"], providedItems:["همبرغر","برغر"], description:"سجل تجريبي لاختبار البحث عن الهمبرغر في المرج." }
  ];
  await Promise.all(restaurants.map(({ id, ...data }) => setDoc(doc(db,"providers",id), { ...base, ...data, createdAt:serverTimestamp() }, { merge:true })));
  return restaurants.length;
}
