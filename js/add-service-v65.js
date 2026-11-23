import { getActiveRegions } from "./services/regions-service.js";
import { getActiveTownsByRegion } from "./services/towns-service.js";
import { getActiveCategories } from "./services/categories-service.js";
import { getActiveSpecialtiesByCategory } from "./services/specialties-service.js";
import { submitProviderRequest } from "./services/provider-requests-service.js?v=9.9.0";
import { createPaymentIdentity } from "./payment-reference.js";

const form = document.querySelector("#provider-form");
const region = document.querySelector("#region");
const town = document.querySelector("#town");
const category = document.querySelector("#category");
const specialty = document.querySelector("#specialty");
const referralInput = document.querySelector("#referral-code");
const button = document.querySelector("#submit-button");
const status = document.querySelector("#form-status");
const imageInput = document.querySelector("#business-image");
const imagePreviewWrap = document.querySelector("#image-preview-wrap");
const imagePreview = document.querySelector("#image-preview");
const providedItemInput = document.querySelector("#provided-item-input");
const providedItemsList = document.querySelector("#provided-items-list");
const providedItemsStatus = document.querySelector("#provided-items-status");
const providedItemsCount = document.querySelector("#provided-items-count");
const addProvidedItemButton = document.querySelector("#add-provided-item");
const providedItems = [];
let previewUrl = "";

referralInput.addEventListener("input", () => { referralInput.value = referralInput.value.toUpperCase(); });

function clearSelectedImage() {
  imageInput.value = "";
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = "";
  imagePreview.removeAttribute("src");
  imagePreviewWrap.classList.add("hidden");
}

imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (!file) return clearSelectedImage();
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(file.type) || file.size > 3 * 1024 * 1024) {
    clearSelectedImage();
    status.textContent = "اختر صورة JPEG أو PNG أو WebP لا يتجاوز حجمها 3MB.";
    return;
  }
  if (previewUrl) URL.revokeObjectURL(previewUrl);
  previewUrl = URL.createObjectURL(file);
  imagePreview.src = previewUrl;
  imagePreviewWrap.classList.remove("hidden");
  status.textContent = "";
});

document.querySelector("#remove-image").addEventListener("click", clearSelectedImage);

function normalizedProvidedItem(value) {
  return String(value || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("ar");
}

function renderProvidedItems() {
  providedItemsList.replaceChildren();
  providedItems.forEach((item, index) => {
    const chip = document.createElement("span");
    chip.className = "provided-item-chip";
    const label = document.createElement("span");
    label.textContent = item;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.setAttribute("aria-label", `إزالة ${item}`);
    remove.textContent = "×";
    remove.addEventListener("click", () => {
      providedItems.splice(index, 1);
      providedItemsStatus.textContent = "تمت إزالة البند.";
      renderProvidedItems();
      providedItemInput.focus();
    });
    chip.append(label, remove);
    providedItemsList.append(chip);
  });
  providedItemsCount.textContent = String(providedItems.length);
  const full = providedItems.length >= 10;
  providedItemInput.disabled = full;
  addProvidedItemButton.disabled = full;
  if (full) providedItemsStatus.textContent = "وصلت إلى الحد الأقصى: 10 بنود.";
}

function addProvidedItem() {
  const item = providedItemInput.value.trim().replace(/\s+/g, " ");
  providedItemInput.setCustomValidity("");
  if (!item) return true;
  if (item.length < 2) {
    providedItemsStatus.textContent = "اكتب بنداً من حرفين على الأقل.";
    providedItemInput.setCustomValidity("اكتب بنداً من حرفين على الأقل.");
    providedItemInput.reportValidity();
    return false;
  }
  if (providedItems.length >= 10) {
    providedItemsStatus.textContent = "يمكنك إضافة 10 بنود كحد أقصى.";
    return false;
  }
  const normalized = normalizedProvidedItem(item);
  if (providedItems.some(existing => normalizedProvidedItem(existing) === normalized)) {
    providedItemsStatus.textContent = "هذا البند مضاف بالفعل.";
    providedItemInput.value = "";
    return true;
  }
  providedItems.push(item);
  providedItemInput.value = "";
  providedItemsStatus.textContent = "تمت إضافة البند.";
  renderProvidedItems();
  return true;
}

addProvidedItemButton.addEventListener("click", () => {
  if (addProvidedItem()) providedItemInput.focus();
});
providedItemInput.addEventListener("input", () => providedItemInput.setCustomValidity(""));
providedItemInput.addEventListener("keydown", event => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  if (addProvidedItem()) providedItemInput.focus();
});

function setOptions(select, items, placeholder) {
  select.replaceChildren(new Option(placeholder, ""));
  items.forEach(item => select.add(new Option(item.nameEn ? `${item.nameAr} — ${item.nameEn}` : item.nameAr, item.id)));
  select.disabled = items.length === 0;
}

async function loadInitialData() {
  try {
    const [regions, categories] = await Promise.all([getActiveRegions(), getActiveCategories()]);
    setOptions(region, regions, "اختر المنطقة");
    setOptions(category, categories, "اختر الفئة");
  } catch (error) {
    status.textContent = "تعذر تحميل الخيارات. تحقق من الاتصال وحاول مجدداً.";
  }
}

region.addEventListener("change", async () => {
  town.disabled = true; town.replaceChildren(new Option("جارٍ تحميل البلدات…", ""));
  if (!region.value) return setOptions(town, [], "اختر المنطقة أولاً");
  try { setOptions(town, await getActiveTownsByRegion(region.value), "اختر البلدة"); }
  catch { setOptions(town, [], "تعذر تحميل البلدات"); }
});

category.addEventListener("change", async () => {
  specialty.disabled = true; specialty.replaceChildren(new Option("جارٍ تحميل الاختصاصات…", ""));
  if (!category.value) return setOptions(specialty, [], "اختر الفئة أولاً");
  try { setOptions(specialty, await getActiveSpecialtiesByCategory(category.value), "اختر الاختصاص"); }
  catch { setOptions(specialty, [], "تعذر تحميل الاختصاصات"); }
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (document.querySelector("#company-site-trap").value) return;
  if (providedItemInput.value.trim() && !addProvidedItem()) {
    providedItemInput.focus();
    return;
  }
  button.disabled = true; status.textContent = "جارٍ إرسال الطلب…";
  try {
    const identity = createPaymentIdentity({regionId:region.value,townId:town.value,specialtyId:specialty.value,providerName:document.querySelector("#name").value,phone:document.querySelector("#phone").value,regionLabel:region.options[region.selectedIndex]?.text,townLabel:town.options[town.selectedIndex]?.text,specialtyLabel:specialty.options[specialty.selectedIndex]?.text});
    await submitProviderRequest({
      name:document.querySelector("#name").value, regionId:region.value, townId:town.value,
      categoryId:category.value, specialtyId:specialty.value,
      phone:document.querySelector("#phone").value, whatsapp:document.querySelector("#whatsapp").value,
      address:document.querySelector("#address").value, googleMapsUrl:document.querySelector("#google-maps-url").value,
      websiteUrl:document.querySelector("#business-website").value, email:document.querySelector("#business-email").value,
      facebookUrl:document.querySelector("#facebook-url").value, instagramUrl:document.querySelector("#instagram-url").value,
      youtubeUrl:document.querySelector("#youtube-url").value, tiktokUrl:document.querySelector("#tiktok-url").value,
      referralCode:document.querySelector("#referral-code").value, paymentReference:identity.paymentReference, paymentDescription:identity.paymentDescription,
      description:document.querySelector("#description").value, providedItems:[...providedItems]
    }, imageInput.files[0] || null);
    document.querySelector("#success-reference").textContent=identity.paymentReference;document.querySelector("#success-description").textContent=identity.paymentDescription;
    form.classList.add("hidden"); document.querySelector("#success").classList.remove("hidden");
  } catch (error) {
    console.error(error); const code=error?.code||"unknown";status.textContent=`لم يُرسل الطلب. رمز الخطأ: ${code}. حدّث الصفحة وحاول مجدداً، وإذا استمر الخطأ فتأكد من نشر أحدث قواعد Firestore وStorage.`; button.disabled = false;
  }
});

document.querySelector("#copy-reference").addEventListener("click",async()=>{const value=document.querySelector("#success-reference").textContent;try{await navigator.clipboard.writeText(value);document.querySelector("#copy-status").textContent="تم نسخ رقم الطلب.";}catch{document.querySelector("#copy-status").textContent="حدّد الرقم وانسخه يدوياً.";}});

loadInitialData();
