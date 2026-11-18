import { getProviderById } from "./services/providers-service.js";
import { getTownById } from "./services/towns-service.js";
import { getSpecialtyById } from "./services/specialties-service.js";
import { mapsHref, phoneHref, whatsappHref } from "./contact-links.js";
import { showNotice } from "./ui.js";

const params = new URLSearchParams(location.search);
const providerId = params.get("id");
const townId = params.get("town");
const categoryId = params.get("category");
const specialtyId = params.get("specialty");
const loading = document.querySelector("#profile-loading");
const profile = document.querySelector("#provider-profile");

function addAction(container, label, href, className, external = false) {
  if (!href) return;
  const link = document.createElement("a");
  link.className = `contact-button ${className}`;
  link.href = href;
  link.textContent = label;
  if (external) { link.target = "_blank"; link.rel = "noopener"; }
  container.append(link);
}

function stablePalette(value) {
  let hash = 0;
  for (const character of value) hash = ((hash << 5) - hash + character.codePointAt(0)) | 0;
  return (hash >>> 0) % 6;
}

function createGeneratedProfile(element, name, service) {
  element.classList.add("generated-profile", `generated-logo-${stablePalette(name)}`);
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

async function copyProfileUrl(url, status) {
  try {
    await navigator.clipboard.writeText(url);
    status.textContent = "تم نسخ رابط البروفايل.";
  } catch {
    const input = document.createElement("input");
    input.value = url;
    document.body.append(input);
    input.select();
    document.execCommand("copy");
    input.remove();
    status.textContent = "تم نسخ رابط البروفايل.";
  }
}

if (!providerId) {
  showNotice(loading, "لم يتم تحديد مقدّم الخدمة.", "ارجع إلى النتائج واختر مقدّم الخدمة.", true);
} else {
  try {
    const provider = await getProviderById(providerId);
    if (!provider || !provider.isActive) throw new Error("Provider not found");
    const resolvedTownId = townId || provider.townId;
    const [town, specialties] = await Promise.all([
      getTownById(resolvedTownId),
      Promise.all((provider.specialtyIds || []).map(getSpecialtyById))
    ]);
    const selectedSpecialty = specialties.find(item => item?.id === specialtyId) || specialties.find(Boolean);
    const resultsUrl = townId && categoryId
      ? `providers.html?town=${encodeURIComponent(townId)}&category=${encodeURIComponent(categoryId)}${specialtyId ? `&specialty=${encodeURIComponent(specialtyId)}` : ""}`
      : "index.html";
    document.querySelector("#results-back-link").href = resultsUrl;
    document.title = `${provider.name || "مقدّم خدمة"} | أنا بدي`;
    const providerName = provider.name || "مقدّم خدمة";
    const specialtyLabel = selectedSpecialty?.nameAr || "خدمة محلية";
    const profileAvatar = document.querySelector("#profile-avatar");
    if (provider.imageUrl) {
      profileAvatar.classList.add("has-image");
      profileAvatar.style.backgroundImage = `url(${JSON.stringify(provider.imageUrl)})`;
    } else {
      createGeneratedProfile(profileAvatar, providerName, specialtyLabel);
    }
    document.querySelector("#profile-name").textContent = providerName;
    document.querySelector("#profile-specialty").textContent = specialtyLabel;
    document.querySelector("#profile-location").textContent = [town?.nameAr, provider.address].filter(Boolean).join(" · ");
    document.querySelector("#profile-description").textContent = provider.description || "تواصل مباشرةً مع مقدّم الخدمة للحصول على مزيد من المعلومات.";
    const profileUrl = new URL("provider.html", location.href);
    profileUrl.searchParams.set("id", providerId);
    const shareUrl = profileUrl.href;
    const shareText = `${providerName} — ${specialtyLabel} على دليل أنا بدي`;
    const metaDescription = document.querySelector('meta[name="description"]');
    metaDescription.content = `${shareText}. تواصل مباشرةً واطّلع على معلومات الخدمة.`;
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.append(canonical); }
    canonical.href = shareUrl;
    const shareStatus = document.querySelector("#share-status");
    document.querySelector("#share-whatsapp").href = `https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`;
    document.querySelector("#copy-profile-link").addEventListener("click", () => copyProfileUrl(shareUrl, shareStatus));
    document.querySelector("#share-profile").addEventListener("click", async () => {
      if (!navigator.share) return copyProfileUrl(shareUrl, shareStatus);
      try {
        await navigator.share({ title:document.title, text:shareText, url:shareUrl });
        shareStatus.textContent = "تمت مشاركة البروفايل.";
      } catch (error) {
        if (error.name !== "AbortError") shareStatus.textContent = "تعذرت المشاركة. يمكنك نسخ الرابط بدلًا منها.";
      }
    });
    document.querySelector("#profile-verified").hidden = !provider.isVerified;
    document.querySelector("#report-profile-link").href = `contact.html?provider=${encodeURIComponent(providerId)}&pageUrl=${encodeURIComponent(shareUrl)}`;
    if (provider.address) {
      document.querySelector("#profile-address-block").hidden = false;
      document.querySelector("#profile-address").textContent = provider.address;
    }
    const tags = document.querySelector("#profile-specialties");
    specialties.filter(Boolean).forEach(item => { const tag = document.createElement("span"); tag.textContent = item.nameAr; tags.append(tag); });
    if (!tags.children.length) document.querySelector("#profile-specialties-block").hidden = true;
    const actions = document.querySelector("#profile-actions");
    const callUrl = phoneHref(provider.phone);
    const whatsappUrl = whatsappHref(provider.whatsapp || provider.phone);
    addAction(actions, "واتساب", whatsappUrl, "whatsapp-button", true);
    addAction(actions, "اتصال", callUrl, "call-button");
    addAction(actions, "فتح الموقع", provider.googleMapsUrl || mapsHref(provider.address, town?.nameAr), "map-button", true);
    const mobileActions = document.querySelector("#profile-mobile-actions");
    addAction(mobileActions, "واتساب", whatsappUrl, "whatsapp-button", true);
    addAction(mobileActions, "اتصال", callUrl, "call-button");
    loading.hidden = true;
    profile.hidden = false;
  } catch (error) {
    console.error(error);
    showNotice(loading, "تعذّر فتح البروفايل.", "قد يكون مقدّم الخدمة غير متاح أو أن الاتصال تعذّر.", true);
  }
}
