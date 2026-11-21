import { getTownById } from "./services/towns-service.js";
import { getActiveCategories } from "./services/categories-service.js";
import { getActiveProviders, townIdVariants } from "./services/providers-service.js";
import { showNotice } from "./ui.js";

const params = new URLSearchParams(location.search);
const townId = params.get("town");
const container = document.querySelector("#categories");
const localizedName = item => window.AnaBadeI18n?.name(item) || item?.nameAr || item?.nameEn || "";

if (!townId) {
  showNotice(container, "لم يتم اختيار بلدة.", "ارجع إلى المناطق واختر المنطقة ثم البلدة.", true);
} else {
  try {
    const [town, categories] = await Promise.all([getTownById(townId), getActiveCategories()]);
    if (!town) throw new Error("Town not found");
    const providers = await getActiveProviders({ townIds: townIdVariants(town) });
    const counts = providers.reduce((result, provider) => {
      result[provider.categoryId] = (result[provider.categoryId] || 0) + 1;
      return result;
    }, {});

    const townsUrl = `towns.html?region=${encodeURIComponent(town.regionId)}`;
    document.querySelector("#towns-back-link").href = townsUrl;
    document.querySelector("#town-breadcrumb-link").href = townsUrl;
    const townName = localizedName(town);
    document.querySelector("#town-breadcrumb").textContent = townName;
    document.querySelector("#selected-town").textContent = townName;
    document.querySelector("#categories-subtitle").textContent = `اختار الفئة المناسبة ضمن ${townName}.`;
    container.innerHTML = "";
    container.removeAttribute("aria-busy");

    if (!categories.length) {
      showNotice(container, "ما في فئات متاحة حالياً.", "ستظهر الفئات تلقائياً بعد تفعيلها في Firestore.");
    } else {
      categories.forEach((category, index) => {
        const link = document.createElement("a");
        link.className = "category-card";
        link.href = `specialties.html?town=${encodeURIComponent(townId)}&category=${encodeURIComponent(category.id)}`;
        const categoryName = localizedName(category);
        link.setAttribute("aria-label", `اختيار ${categoryName}`);
        link.innerHTML = `<span class="category-symbol" aria-hidden="true"></span><span class="category-copy"><small>فئة ${String(index + 1).padStart(2, "0")}</small><strong></strong><span lang="en" dir="ltr"></span><b class="provider-count-badge"></b></span><span class="category-arrow" aria-hidden="true">←</span>`;
        link.querySelector(".category-symbol").textContent = categoryName.trim().charAt(0) || "•";
        link.querySelector("strong").textContent = categoryName;
        link.querySelector(".category-copy > span").textContent = window.AnaBadeI18n?.language() === "en" ? (category.nameAr || "") : (category.nameEn || "");
        link.querySelector(".provider-count-badge").textContent = `${(counts[category.id] || 0).toLocaleString("en-US")} مسجّل`;
        container.append(link);
      });
    }
  } catch (error) {
    console.error(error);
    showNotice(container, "ما قدرنا نحمّل فئات الخدمات.", "تحقّق من الإنترنت ومن Firestore Security Rules ثم حاول مجدداً.", true);
  }
}
