import { getTownById } from "./services/towns-service.js";
import { getCategoryById } from "./services/categories-service.js";
import { getActiveSpecialtiesByCategory } from "./services/specialties-service.js";
import { showNotice } from "./ui.js";

const params = new URLSearchParams(location.search);
const townId = params.get("town");
const categoryId = params.get("category");
const container = document.querySelector("#specialties");
const localizedName = item => window.AnaBadeI18n?.name(item) || item?.nameAr || item?.nameEn || "";

if (!townId || !categoryId) {
  showNotice(container, "الاختيارات غير مكتملة.", "ارجع واختر البلدة وفئة الخدمة أولاً.", true);
} else {
  try {
    const [town, category, specialties] = await Promise.all([
      getTownById(townId),
      getCategoryById(categoryId),
      getActiveSpecialtiesByCategory(categoryId)
    ]);
    if (!town || !category) throw new Error("Selection not found");

    const townsUrl = `towns.html?region=${encodeURIComponent(town.regionId)}`;
    const categoriesUrl = `categories.html?town=${encodeURIComponent(townId)}`;
    document.querySelector("#towns-link").href = townsUrl;
    document.querySelector("#categories-link").href = categoriesUrl;
    document.querySelector("#categories-back-link")?.setAttribute("href", categoriesUrl);
    const townName = localizedName(town), categoryName = localizedName(category);
    document.querySelector("#category-breadcrumb").textContent = categoryName;
    document.querySelector("#selected-town").textContent = townName;
    document.querySelector("#selected-category").textContent = categoryName;
    document.querySelector("#specialties-subtitle").textContent = `اختار الاختصاص المناسب ضمن ${categoryName}.`;
    container.innerHTML = "";
    container.removeAttribute("aria-busy");

    if (!specialties.length) {
      showNotice(container, "ما في اختصاصات ضمن هالفئة حالياً.", "يمكن لاحقاً الانتقال مباشرةً إلى النتائج عند عدم وجود اختصاصات.");
    } else {
      specialties.forEach((specialty, index) => {
        const link = document.createElement("a");
        link.className = "specialty-row";
        link.href = `providers.html?town=${encodeURIComponent(townId)}&category=${encodeURIComponent(categoryId)}&specialty=${encodeURIComponent(specialty.id)}`;
        const specialtyName = localizedName(specialty);
        link.setAttribute("aria-label", `اختيار ${specialtyName}`);
        link.innerHTML = `<span class="specialty-index"></span><span class="specialty-copy"><strong></strong><small lang="en" dir="ltr"></small></span><span class="specialty-action">عرض النتائج <b aria-hidden="true">←</b></span>`;
        link.querySelector(".specialty-index").textContent = String(index + 1).padStart(2, "0");
        link.querySelector("strong").textContent = specialtyName;
        link.querySelector("small").textContent = window.AnaBadeI18n?.language() === "en" ? (specialty.nameAr || "") : (specialty.nameEn || "");
        container.append(link);
      });
    }
  } catch (error) {
    console.error(error);
    showNotice(container, "ما قدرنا نحمّل الاختصاصات.", "تحقّق من الإنترنت ومن Firestore Security Rules ثم حاول مجدداً.", true);
  }
}
