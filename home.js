import { getActiveRegions } from "./services/regions-service.js";
import { showNotice } from "./ui.js";

const container = document.querySelector("#regions");

try {
  const regions = await getActiveRegions();
  container.innerHTML = "";
  container.removeAttribute("aria-busy");
  if (!regions.length) {
    showNotice(container, "ما في مناطق متاحة حالياً.", "ستظهر هون تلقائياً بعد تفعيلها في Firestore.");
  } else {
    regions.forEach((region, index) => {
      const link = document.createElement("a");
      link.className = "region-card";
      link.href = `towns.html?region=${encodeURIComponent(region.id)}`;
      link.setAttribute("aria-label", `اختيار ${region.nameAr}`);
      link.innerHTML = `<span class="region-number">${String(index + 1).padStart(2, "0")}</span><span><strong></strong><small lang="en" dir="ltr"></small></span><span class="arrow" aria-hidden="true">←</span>`;
      link.querySelector("strong").textContent = region.nameAr;
      link.querySelector("small").textContent = region.nameEn || "";
      container.append(link);
    });
  }
} catch (error) {
  console.error(error);
  showNotice(container, "ما قدرنا نحمّل المناطق.", "تحقّق من الإنترنت ومن Firestore Security Rules ثم أعد تحميل الصفحة.", true);
}
