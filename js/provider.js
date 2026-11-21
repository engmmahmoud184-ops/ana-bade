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
const localizedName = item => window.AnaBadeI18n?.name(item) || item?.nameAr || item?.nameEn || "";
const isEnglish = () => window.AnaBadeI18n?.language() === "en";

function addAction(container, label, href, className, icon = "", external = false) {
  if (!href) return;
  const link = document.createElement("a");
  link.className = `contact-button ${className}`;
  link.href = href;
  link.setAttribute("aria-label", label);
  if (icon) {
    const iconWrap = document.createElement("span");
    iconWrap.className = "contact-icon";
    iconWrap.setAttribute("aria-hidden", "true");
    iconWrap.innerHTML = icon;
    link.append(iconWrap);
  }
  const text = document.createElement("span");
  text.textContent = label;
  link.append(text);
  if (external) { link.target = "_blank"; link.rel = "noopener"; }
  container.append(link);
}

const phoneIcon = '<svg viewBox="0 0 24 24" focusable="false"><path d="M6.6 10.8c1.7 3.3 3.3 4.9 6.6 6.6l2.2-2.2c.3-.3.7-.4 1.1-.2 1.2.4 2.5.6 3.8.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.7 21 3 13.3 3 3.7c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.3.2 2.6.6 3.8.1.4 0 .8-.2 1.1l-2.2 2.2Z"/></svg>';
const whatsappIcon = '<svg viewBox="0 0 24 24" focusable="false"><path d="M20.5 3.5A11.8 11.8 0 0 0 12.1 0C5.6 0 .3 5.3.3 11.8c0 2.1.5 4.1 1.6 5.9L.2 24l6.4-1.7c1.7.9 3.6 1.4 5.5 1.4 6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.4-8.4Zm-8.4 18.2c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.8 1 1-3.7-.2-.4a9.8 9.8 0 1 1 8.4 4.7Zm5.4-7.3c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.7.2-.2.3-.8.9-1 1.1-.2.2-.4.2-.7.1-1.8-.9-3-1.6-4.2-3.7-.3-.5.3-.5.9-1.7.1-.2 0-.4 0-.6l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.2-1.2 2.9 0 1.7 1.2 3.3 1.4 3.5.2.2 2.4 3.7 5.9 5.2.8.4 1.5.6 2 .7.8.3 1.6.2 2.2.1.7-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4-.2-.1-.4-.2-.7-.3Z"/></svg>';
const mapIcon = '<svg viewBox="0 0 24 24" focusable="false"><path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z"/></svg>';
const onlineIcons = {
  website:'<svg viewBox="0 0 24 24" focusable="false"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 6h-3.1a15.7 15.7 0 0 0-1.4-3.5A8.1 8.1 0 0 1 18.9 8ZM12 4c.8 1 1.5 2.3 1.8 4h-3.6C10.5 6.3 11.2 5 12 4ZM4.3 14a8 8 0 0 1 0-4h3.4a16.5 16.5 0 0 0 0 4H4.3Zm.8 2h3.1a15.7 15.7 0 0 0 1.4 3.5A8.1 8.1 0 0 1 5.1 16Zm3.1-8H5.1a8.1 8.1 0 0 1 4.5-3.5A15.7 15.7 0 0 0 8.2 8Zm3.8 12c-.8-1-1.5-2.3-1.8-4h3.6c-.3 1.7-1 3-1.8 4Zm2.2-6H9.8a14.5 14.5 0 0 1 0-4h4.4a14.5 14.5 0 0 1 0 4Zm.2 5.5a15.7 15.7 0 0 0 1.4-3.5h3.1a8.1 8.1 0 0 1-4.5 3.5Zm1.9-5.5a16.5 16.5 0 0 0 0-4h3.4a8 8 0 0 1 0 4h-3.4Z"/></svg>',
  email:'<svg viewBox="0 0 24 24" focusable="false"><path d="M20 4H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h16a2 2 0 0 0 2-2V6c0-1.1-.9-2-2-2Zm0 4-8 5-8-5V6l8 5 8-5v2Z"/></svg>',
  facebook:'<svg viewBox="0 0 24 24" focusable="false"><path d="M22 12A10 10 0 1 0 10.4 22v-7H8v-3h2.4V9.7c0-2.4 1.4-3.7 3.6-3.7 1 0 2.1.2 2.1.2v2.6H15c-1.2 0-1.6.8-1.6 1.5V12h2.8l-.4 3h-2.4v7A10 10 0 0 0 22 12Z"/></svg>',
  instagram:'<svg viewBox="0 0 24 24" focusable="false"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3H7Zm10.5 1.5A1.25 1.25 0 1 1 17.5 8a1.25 1.25 0 0 1 0-2.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"/></svg>',
  youtube:'<svg viewBox="0 0 24 24" focusable="false"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.3 3.6-6.3 3.6Z"/></svg>',
  tiktok:'<svg viewBox="0 0 24 24" focusable="false"><path d="M16.6 2c.3 2.5 1.7 4 4.4 4.2v3.1a8.4 8.4 0 0 1-4.4-1.2v6.1A6.2 6.2 0 1 1 11.2 8v3.2a3 3 0 1 0 2.2 2.9V2h3.2Z"/></svg>'
};

function addOnlineLink(container, { label, href, icon, className = "" }) {
  if (!href) return false;
  try {
    const protocol = new URL(href).protocol;
    if (!['https:', 'http:', 'mailto:'].includes(protocol)) return false;
  } catch {
    return false;
  }
  const link = document.createElement("a");
  link.className = `business-online-link ${className}`.trim();
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  const iconWrap = document.createElement("span");
  iconWrap.className = "online-link-icon";
  iconWrap.setAttribute("aria-hidden", "true");
  iconWrap.innerHTML = icon;
  const text = document.createElement("span");
  text.textContent = label;
  const arrow = document.createElement("b");
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "↗";
  link.append(iconWrap, text, arrow);
  container.append(link);
  return true;
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
    const specialtyLabel = localizedName(selectedSpecialty) || (isEnglish() ? "Local service" : "خدمة محلية");
    const profileAvatar = document.querySelector("#profile-avatar");
    if (provider.imageUrl) {
      profileAvatar.classList.add("has-image");
      profileAvatar.style.backgroundImage = `url(${JSON.stringify(provider.imageUrl)})`;
    } else {
      createGeneratedProfile(profileAvatar, providerName, specialtyLabel);
    }
    document.querySelector("#profile-name").textContent = providerName;
    document.querySelector("#profile-specialty").textContent = specialtyLabel;
    document.querySelector("#profile-location").textContent = [localizedName(town), provider.address].filter(Boolean).join(" · ");
    document.querySelector("#profile-description").textContent = provider.description || (isEnglish() ? "Contact the provider directly for more information." : "تواصل مباشرةً مع مقدّم الخدمة للحصول على مزيد من المعلومات.");
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
    specialties.filter(Boolean).forEach(item => { const tag = document.createElement("span"); tag.textContent = localizedName(item); tags.append(tag); });
    if (!tags.children.length) document.querySelector("#profile-specialties-block").hidden = true;
    const webLinks = document.querySelector("#profile-web-links");
    const socialLinks = document.querySelector("#profile-social-links");
    let onlineLinkCount = 0;
    onlineLinkCount += addOnlineLink(webLinks, { label:"زيارة الموقع الإلكتروني", href:provider.websiteUrl, icon:onlineIcons.website, className:"website-link" }) ? 1 : 0;
    onlineLinkCount += addOnlineLink(webLinks, { label:provider.email || "إرسال بريد إلكتروني", href:provider.email ? `mailto:${provider.email}` : "", icon:onlineIcons.email, className:"email-link" }) ? 1 : 0;
    [
      ["فيسبوك", provider.facebookUrl, "facebook"],
      ["إنستغرام", provider.instagramUrl, "instagram"],
      ["يوتيوب", provider.youtubeUrl, "youtube"],
      ["تيك توك", provider.tiktokUrl, "tiktok"]
    ].forEach(([label, href, platform]) => {
      if (addOnlineLink(socialLinks, { label, href, icon:onlineIcons[platform], className:`social-${platform}` })) onlineLinkCount += 1;
    });
    document.querySelector("#profile-online-block").hidden = onlineLinkCount === 0;

    const sameAs = [provider.facebookUrl, provider.instagramUrl, provider.youtubeUrl, provider.tiktokUrl].filter(Boolean);
    const structuredData = {
      "@context":"https://schema.org", "@type":"LocalBusiness", name:providerName,
      description:provider.description || undefined, image:provider.imageUrl || undefined,
      telephone:provider.phone || undefined, email:provider.email || undefined,
      url:provider.websiteUrl || shareUrl, sameAs:sameAs.length ? sameAs : undefined,
      address:provider.address ? { "@type":"PostalAddress", streetAddress:provider.address, addressLocality:town?.nameAr, addressCountry:"LB" } : undefined
    };
    const jsonLd = document.createElement("script");
    jsonLd.type = "application/ld+json";
    jsonLd.textContent = JSON.stringify(structuredData);
    document.head.append(jsonLd);
    const actions = document.querySelector("#profile-actions");
    const callUrl = phoneHref(provider.phone);
    const whatsappUrl = whatsappHref(provider.whatsapp || provider.phone);
    addAction(actions, "مراسلة واتساب", whatsappUrl, "whatsapp-button", whatsappIcon, true);
    addAction(actions, "اتصل الآن", callUrl, "call-button", phoneIcon);
    addAction(actions, "فتح الموقع", provider.googleMapsUrl || mapsHref(provider.address, town?.nameAr), "map-button", mapIcon, true);
    const mobileActions = document.querySelector("#profile-mobile-actions");
    addAction(mobileActions, "مراسلة واتساب", whatsappUrl, "whatsapp-button", whatsappIcon, true);
    addAction(mobileActions, "اتصل الآن", callUrl, "call-button", phoneIcon);
    loading.hidden = true;
    profile.hidden = false;
  } catch (error) {
    console.error(error);
    showNotice(loading, "تعذّر فتح البروفايل.", "قد يكون مقدّم الخدمة غير متاح أو أن الاتصال تعذّر.", true);
  }
}
