import { getTownById } from "./services/towns-service.js";
import { getCategoryById } from "./services/categories-service.js";
import { getSpecialtyById } from "./services/specialties-service.js";
import { getActiveProviders } from "./services/providers-service.js";
import { phoneHref, whatsappHref } from "./contact-links.js";
import { showNotice } from "./ui.js";

const params = new URLSearchParams(location.search);
const townId = params.get("town");
const categoryId = params.get("category");
const specialtyId = params.get("specialty");
const container = document.querySelector("#providers");

function actionLink(label, href, className, icon, external = false) {
  if (!href) return "";
  const target = external ? ' target="_blank" rel="noopener"' : "";
  return `<a class="contact-button ${className}" href="${href}" aria-label="${label}"${target}><span class="contact-icon" aria-hidden="true">${icon}</span><span>${label}</span></a>`;
}

const phoneIcon = '<svg viewBox="0 0 24 24" focusable="false"><path d="M6.6 10.8c1.7 3.3 3.3 4.9 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.2 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.7 21 3 13.3 3 3.7c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.2 1.1l-2.2 2.2Z"/></svg>';
const whatsappIcon = '<svg viewBox="0 0 24 24" focusable="false"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.5 4.1 1.6 5.9L.2 24l6.4-1.7c1.7.9 3.6 1.4 5.5 1.4 6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.4-8.4Zm-8.4 18.2c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.8 1 1-3.7-.2-.4a9.8 9.8 0 1 1 8.4 4.7Zm5.4-7.3c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.2-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-1.8-.9-3-1.6-4.2-3.7-.3-.5.3-.5.9-1.7.1-.2 0-.4 0-.6l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9 0 1.7 1.2 3.3 1.4 3.5.2.2 2.4 3.7 5.9 5.2.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.2-.1-.4-.2-.7-.3Z"/></svg>';

function stablePalette(value) {
  let hash = 0;
  for (const character of value) hash = ((hash << 5) - hash + character.codePointAt(0)) | 0;
  return (hash >>> 0) % 6;
}

function createGeneratedLogo(element, name, service) {
  element.classList.add("generated-logo", `generated-logo-${stablePalette(name)}`);
  element.textContent = "";
  const mark = document.createElement("span");
  mark.className = "generated-logo-mark";
  mark.textContent = name.trim().charAt(0) || "أ";
  const title = document.createElement("strong");
  title.textContent = name;
  const subtitle = document.createElement("small");
  subtitle.textContent = service;
  element.append(mark, title, subtitle);
}

if (!townId || !categoryId) {
  showNotice(container, "الاختيارات غير مكتملة.", "ارجع واختر الفئة والمنطقة والبلدة أولاً.", true);
} else {
  try {
    const [town, category, specialty] = await Promise.all([
      getTownById(townId), getCategoryById(categoryId), specialtyId ? getSpecialtyById(specialtyId) : Promise.resolve(null)
    ]);
    if (!town || !category || (specialtyId && !specialty)) throw new Error("Selection not found");
    const normalizedLegacyKey = String(town.legacyKey || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const providers = await getActiveProviders({ townIds: [townId, town.legacyKey, normalizedLegacyKey], categoryId, specialtyId });

    const townsUrl = `towns.html?region=${encodeURIComponent(town.regionId)}&category=${encodeURIComponent(categoryId)}`;
    const categoriesUrl = `categories.html?town=${encodeURIComponent(townId)}`;
    const specialtiesUrl = `specialties.html?town=${encodeURIComponent(townId)}&category=${encodeURIComponent(categoryId)}`;
    document.querySelector("#towns-link").href = townsUrl;
    document.querySelector("#categories-link").href = categoriesUrl;
    document.querySelector("#specialties-link").href = specialtiesUrl;
    document.querySelector("#specialties-back-link").href = specialtiesUrl;
    const serviceLabel = specialty?.nameAr || category.nameAr;
    document.querySelector("#providers-title").textContent = `${serviceLabel} في ${town.nameAr}`;
    document.querySelector("#providers-subtitle").textContent = "اختار مقدم الخدمة وتواصل معه مباشرة.";
    document.querySelector("#providers-count").textContent = `${providers.length.toLocaleString("en-US")} ${providers.length === 1 ? "خيار متاح" : "خيارات متاحة"}`;
    container.innerHTML = "";
    container.removeAttribute("aria-busy");

    if (!providers.length) {
      showNotice(container, "ما لقينا مقدّمي خدمة ضمن هذه الفئة حالياً.", "ستظهر النتائج تلقائياً عند إضافة مقدّمين فعّالين ضمن البلدة والفئة.");
    } else {
      providers.forEach(provider => {
        const card = document.createElement("article");
        card.className = "provider-card";
        const specialtyPart = specialtyId ? `&specialty=${encodeURIComponent(specialtyId)}` : "";
        const profileUrl = `provider.html?id=${encodeURIComponent(provider.id)}&town=${encodeURIComponent(townId)}&category=${encodeURIComponent(categoryId)}${specialtyPart}`;
        const call = phoneHref(provider.phone);
        const whatsapp = whatsappHref(provider.whatsapp || provider.phone);
        card.innerHTML = `<a class="provider-logo-link" href="${profileUrl}"><span class="provider-avatar" aria-hidden="true"></span></a><h2><a class="provider-name-link" href="${profileUrl}"></a></h2><div class="contact-actions">${actionLink("واتساب", whatsapp, "whatsapp-button", whatsappIcon, true)}${actionLink("اتصال", call, "call-button", phoneIcon)}</div>`;
        const avatar = card.querySelector(".provider-avatar");
        const providerName = provider.name || "مقدّم خدمة";
        if (provider.imageUrl) {
          avatar.classList.add("has-image");
          avatar.style.backgroundImage = `url(${JSON.stringify(provider.imageUrl)})`;
        } else {
          createGeneratedLogo(avatar, providerName, specialty?.nameAr || category.nameAr);
        }
        card.querySelector(".provider-name-link").textContent = providerName;
        card.querySelector(".provider-logo-link").setAttribute("aria-label", `فتح بروفايل ${providerName}`);
        container.append(card);
      });
    }
  } catch (error) {
    console.error(error);
    showNotice(container, "ما قدرنا نحمّل مقدّمي الخدمة.", "تحقّق من الإنترنت ومن Firestore Security Rules ثم حاول مجدداً.", true);
  }
}
