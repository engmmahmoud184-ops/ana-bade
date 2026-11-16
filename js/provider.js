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
    const profileAvatar = document.querySelector("#profile-avatar");
    profileAvatar.textContent = (provider.name || "خ").trim().charAt(0);
    if (provider.imageUrl) {
      profileAvatar.classList.add("has-image");
      profileAvatar.style.backgroundImage = `url(${JSON.stringify(provider.imageUrl)})`;
    }
    document.querySelector("#profile-name").textContent = provider.name || "مقدّم خدمة";
    document.querySelector("#profile-specialty").textContent = selectedSpecialty?.nameAr || "خدمة محلية";
    document.querySelector("#profile-location").textContent = [town?.nameAr, provider.address].filter(Boolean).join(" · ");
    document.querySelector("#profile-description").textContent = provider.description || "تواصل مباشرةً مع مقدّم الخدمة للحصول على مزيد من المعلومات.";
    const profileUrl = new URL("provider.html", location.href);
    profileUrl.searchParams.set("id", providerId);
    const shareUrl = profileUrl.href;
    const specialtyLabel = selectedSpecialty?.nameAr || "خدمة محلية";
    const shareText = `${provider.name || "مقدّم خدمة"} — ${specialtyLabel} على دليل أنا بدي`;
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
    if (provider.address) {
      document.querySelector("#profile-address-block").hidden = false;
      document.querySelector("#profile-address").textContent = provider.address;
    }
    const tags = document.querySelector("#profile-specialties");
    specialties.filter(Boolean).forEach(item => { const tag = document.createElement("span"); tag.textContent = item.nameAr; tags.append(tag); });
    if (!tags.children.length) document.querySelector("#profile-specialties-block").hidden = true;
    const actions = document.querySelector("#profile-actions");
    addAction(actions, `اتصال ${provider.phone || ""}`.trim(), phoneHref(provider.phone), "call-button");
    addAction(actions, "مراسلة عبر واتساب", whatsappHref(provider.whatsapp || provider.phone), "whatsapp-button", true);
    addAction(actions, "فتح العنوان على الخريطة", provider.googleMapsUrl || mapsHref(provider.address, town?.nameAr), "map-button", true);
    loading.hidden = true;
    profile.hidden = false;
  } catch (error) {
    console.error(error);
    showNotice(loading, "تعذّر فتح البروفايل.", "قد يكون مقدّم الخدمة غير متاح أو أن الاتصال تعذّر.", true);
  }
}
