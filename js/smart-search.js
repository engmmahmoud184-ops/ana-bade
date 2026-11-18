import { getActiveRegions } from "./services/regions-service.js";
import { getAllActiveTowns } from "./services/towns-service.js";
import { getActiveCategories } from "./services/categories-service.js";
import { getAllActiveSpecialties } from "./services/specialties-service.js";
import { getAllActiveProviders, townIdVariants } from "./services/providers-service.js";
import { normalizeSearch } from "./ui.js";

const form = document.querySelector("#smart-search-form");
const serviceInput = document.querySelector("#service-search");
const locationInput = document.querySelector("#location-search");
const serviceList = document.querySelector("#service-suggestions");
const locationList = document.querySelector("#location-suggestions");
const status = document.querySelector("#smart-search-status");
const submitButton = document.querySelector("#smart-search-submit");

const categoryAliases = {
  "food-restaurants":"مطعم مطاعم اكل أكل طعام وجبات توصيل restaurant restaurants food delivery",
  "health-medical":"دكتور طبيب اطباء أطباء مستشفى عيادة صحة صيدلية doctor clinic health medical pharmacy",
  "education-training":"استاذ أستاذ معلم مدرسة جامعة دروس تعليم تدريب teacher school education training",
  "cars-vehicles":"ميكانيكي سيارات سيارة دواليب كهرباء سيارات mechanic car cars vehicle garage",
  "construction-workshops":"بناء ورشة حداد نجار باطون construction workshop carpenter blacksmith",
  "home-maintenance":"كهربجي سباك دهان صيانة منزل تنظيف كهرباء plumber electrician maintenance cleaning",
  "photography-events":"مصور تصوير عرس حفلات مناسبات photographer photography wedding events",
  "professional-services":"محامي محاسب مهندس ترجمة خدمات مهنية lawyer accountant engineer professional",
  "technology-electronics":"كمبيوتر موبايل برمجة تكنولوجيا الكترونيات إلكترونيات computer mobile technology electronics",
  "beauty-care":"حلاق كوافير تجميل صالون عناية beauty barber salon care",
  "shops-retail":"محل سوق تجارة تسوق البسة ألبسة shop shops retail store shopping",
  "agriculture-animals":"زراعة مزارع حيوانات بيطري agriculture farm animals veterinary",
  "transport-delivery":"تاكسي نقل توصيل شحن taxi transport delivery shipping",
  "sports-entertainment":"رياضة نادي ترفيه العاب ألعاب gym sports entertainment games"
};

// User language is often a product or a need, while Firestore stores precise specialties.
// These aliases deliberately point to existing specialty document IDs (the leaves).
const specialtyAliases = {
  "lawyer":"محامي محاماة محاميين استشارة قانونية قانون دعاوى lawyer attorney legal",
  "notary":"كاتب عدل وكالة وكالات تصديق مستندات notary",
  "accountant":"محاسب محاسبة ضرائب حسابات accountant accounting tax",
  "real-estate-office":"عقارات عقار بيع بيت شراء بيت ايجار إيجار مكتب عقاري real estate property",
  "laptop-shop":"لابتوب لابتوبات نوتبوك كمبيوتر محمول شراء لابتوب بيع لابتوب laptop laptops notebook",
  "computer-repair":"تصليح لابتوب صيانة لابتوب تصليح كمبيوتر صيانة كمبيوتر فورمات laptop repair computer repair format",
  "mobile-shop":"تلفون تليفون هاتف جوال موبايل سمارت فون شراء تلفون بيع تلفون phone mobile smartphone",
  "mobile-repair":"تصليح تلفون صيانة تلفون شاشة تلفون بطارية تلفون تصليح موبايل صيانة موبايل phone repair mobile repair",
  "electronics-shop":"الكترونيات إلكترونيات اجهزة أجهزة كهربائية electronics devices",
  "internet-services":"انترنت إنترنت اشتراك نت واي فاي wifi internet",
  "software-development":"برمجة تطبيق برنامج سيستم software app application programming",
  "web-design":"موقع وبسايت ويب تصميم موقع website web design",
  "graphic-design":"غرافيك جرافيك لوغو شعار هوية بصرية graphic logo branding",
  "printing":"طباعة مطبعة كرت بزنس بروشور banner printing press",
  "security-cameras":"كاميرات مراقبة كاميرا مراقبة cctv security camera",
  "electrician":"كهربجي كهربائي كهرباء منزل اشتراك كهرباء electrician electrical",
  "building-electrician":"كهربجي بناء كهرباء بناء تمديد كهرباء building electrician wiring",
  "plumber":"سباك صحي تمديدات مياه plumber plumbing",
  "home-plumber":"سباك منازل سباك بيت مجاري مياه home plumber plumbing",
  "car-mechanic":"ميكانيكي ميكانيك تصليح سيارة كراج mechanic garage car repair",
  "auto-electrician":"كهربجي سيارات كهربائي سيارات كهرباء سيارة auto electrician",
  "tires":"دواليب اطارات إطارات بنشرجي tires wheels puncture",
  "restaurant":"مطعم مطاعم اكل أكل غدا غداء عشا عشاء restaurant food",
  "fast-food":"فاست فود وجبة سريعة برغر برغر ساندويش fast food burger sandwich",
  "cafe":"كافيه قهوة اركيلة أركيلة coffee cafe",
  "bakery":"فرن مخبز خبز bakery bread",
  "dentist":"طبيب اسنان طبيب أسنان دكتور اسنان دكتور أسنان سنان dentist dental",
  "general-doctor":"دكتور طبيب حكيم طب عام doctor physician general doctor",
  "pediatrician":"طبيب اطفال طبيب أطفال دكتور اطفال دكتور أطفال pediatrician children doctor",
  "ophthalmologist":"طبيب عيون دكتور عيون عيون ophthalmologist eye doctor",
  "dermatologist":"طبيب جلدية دكتور جلد جلدية dermatologist skin doctor",
  "cardiologist":"طبيب قلب دكتور قلب قلب cardiologist heart doctor",
  "gynecologist":"طبيب نسائية دكتور نسائية نسائية gynecologist women doctor",
  "pharmacy":"صيدلية دوا دواء ادوية أدوية pharmacy medicine",
  "medical-laboratory":"مختبر تحاليل فحص دم تحاليل laboratory blood test",
  "physiotherapy":"علاج فيزيائي علاج طبيعي فيزيو physiotherapy physical therapy",
  "barber":"حلاق حلاقة رجالي barber haircut",
  "women-salon":"كوافير صالون نسائي شعر نسائي women salon hairdresser",
  "photographer":"مصور فوتوغراف تصوير صور photographer photo",
  "videographer":"تصوير فيديو فيديو عرس videographer video",
  "taxi":"تاكسي سيارة اجرة سيارة أجرة taxi cab",
  "delivery":"دليفري توصيل طلب توصيل طلبات delivery courier",
  "private-tutor":"استاذ خصوصي أستاذ خصوصي مدرس خصوصي دروس خصوصية private tutor",
  "school":"مدرسة تسجيل مدرسة school",
  "veterinarian":"بيطري طبيب حيوانات دكتور حيوانات veterinarian vet"
};

let serviceItems = [];
let locationItems = [];
let selectedService = null;
let selectedLocation = null;
let townsByVariant = new Map();
let townById = new Map();
let regionById = new Map();
let categoryById = new Map();
let ready = false;

function language() {
  return localStorage.getItem("anaBadeLanguage") === "en" ? "en" : "ar";
}

function itemName(item) {
  if (item.name) return item.name;
  return language() === "en" ? (item.nameEn || item.nameAr) : (item.nameAr || item.nameEn);
}

function looseTokens(value) {
  return normalizeSearch(String(value || ""))
    .replace(/[^a-z0-9\u0600-\u06ff]+/gi, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(token => token.startsWith("ال") && token.length > 3 ? token.slice(2) : token);
}

function searchable(value) {
  return looseTokens(value).join(" ");
}

function matchScore(item, query) {
  const needle = searchable(query);
  if (!needle) return item.defaultRank ?? 10;
  const haystack = item.searchText;
  if (haystack === needle) return 120;
  if (haystack.startsWith(needle)) return 100;
  if (haystack.includes(needle)) return 82;
  const tokens = needle.split(" ");
  if (tokens.every(token => haystack.includes(token))) return 65;
  if (tokens.some(token => haystack.includes(token))) return 35;
  return 0;
}

function matchesLocation(provider, location) {
  const providerTown = townsByVariant.get(provider.townId) || townById.get(provider.townId);
  if (!providerTown) return false;
  return location.type === "town" ? providerTown.id === location.id : providerTown.regionId === location.id;
}

function ranked(items, query, limit = 8) {
  return items
    .map(item => ({ item, score:matchScore(item, query) }))
    .filter(entry => entry.score > 0)
    .sort((a, b) => b.score - a.score || (a.item.typeRank ?? 9) - (b.item.typeRank ?? 9) || itemName(a.item).localeCompare(itemName(b.item), language()))
    .slice(0, limit)
    .map(entry => entry.item);
}

function serviceTypeLabel(type) {
  const ar = { category:"فئة عامة", specialty:"اختصاص دقيق", provider:"بزنس أو شخص" };
  const en = { category:"General category", specialty:"Precise specialty", provider:"Business or provider" };
  return (language() === "en" ? en : ar)[type];
}

function locationTypeLabel(type) {
  const ar = { town:"بلدة", region:"منطقة" };
  const en = { town:"Town", region:"Region" };
  return (language() === "en" ? en : ar)[type];
}

function setExpanded(input, list, expanded) {
  input.setAttribute("aria-expanded", String(expanded));
  list.hidden = !expanded;
  if (!expanded) input.removeAttribute("aria-activedescendant");
}

function renderSuggestions(input, list, items, kind) {
  list.replaceChildren();
  if (!items.length) {
    const empty = document.createElement("li");
    empty.className = "smart-suggestion-empty";
    empty.textContent = language() === "en" ? "No matching suggestions" : "ما لقينا اقتراح مطابق";
    list.append(empty);
    setExpanded(input, list, true);
    return;
  }
  items.forEach((item, index) => {
    const option = document.createElement("li");
    option.id = `${list.id}-option-${index}`;
    option.className = "smart-suggestion";
    option.setAttribute("role", "option");
    option.dataset.index = String(index);
    const icon = document.createElement("span");
    icon.className = "suggestion-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = kind === "service" ? ({ category:"⌘", specialty:"•", provider:"✓" }[item.type]) : (item.type === "town" ? "⌖" : "◉");
    const copy = document.createElement("span");
    const title = document.createElement("strong");
    const meta = document.createElement("small");
    title.textContent = itemName(item);
    meta.textContent = kind === "service" ? `${serviceTypeLabel(item.type)}${item.meta ? ` · ${item.meta}` : ""}` : `${locationTypeLabel(item.type)}${item.meta ? ` · ${item.meta}` : ""}`;
    copy.append(title, meta);
    option.append(icon, copy);
    option.addEventListener("pointerdown", event => event.preventDefault());
    option.addEventListener("click", () => choose(input, list, item, kind));
    list.append(option);
  });
  list._items = items;
  list._activeIndex = -1;
  setExpanded(input, list, true);
}

function choose(input, list, item, kind) {
  input.value = itemName(item);
  if (kind === "service") selectedService = item; else selectedLocation = item;
  input.classList.add("has-selection");
  setExpanded(input, list, false);
  status.textContent = language() === "en" ? "Ready to search." : "جاهز للبحث.";
  (kind === "service" ? locationInput : submitButton).focus();
}

function suggestionsFor(kind, query) {
  let items = kind === "service" ? serviceItems : locationItems;
  if (kind === "service" && selectedLocation) {
    items = items.filter(item => item.type !== "provider" || matchesLocation(item.raw, selectedLocation));
  }
  if (kind === "service" && searchable(query).length < 2) items = items.filter(item => item.type !== "provider");
  if (kind === "service" && searchable(query)) {
    const hasStrongLeaf = items.some(item => item.type === "specialty" && matchScore(item, query) >= 65);
    if (hasStrongLeaf) items = items.filter(item => item.type !== "category");
  }
  return ranked(items, query);
}

function refresh(input, list, kind) {
  if (!ready) return;
  renderSuggestions(input, list, suggestionsFor(kind, input.value), kind);
}

function moveActive(input, list, direction) {
  const options = [...list.querySelectorAll('[role="option"]')];
  if (!options.length) return;
  list._activeIndex = ((list._activeIndex ?? -1) + direction + options.length) % options.length;
  options.forEach((option, index) => option.setAttribute("aria-selected", String(index === list._activeIndex)));
  const active = options[list._activeIndex];
  input.setAttribute("aria-activedescendant", active.id);
  active.scrollIntoView({ block:"nearest" });
}

function bindCombobox(input, list, kind) {
  input.addEventListener("focus", () => refresh(input, list, kind));
  input.addEventListener("input", () => {
    input.classList.remove("has-selection");
    if (kind === "service") selectedService = null; else selectedLocation = null;
    refresh(input, list, kind);
  });
  input.addEventListener("keydown", event => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (list.hidden) refresh(input, list, kind);
      moveActive(input, list, event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter" && !list.hidden && list._activeIndex >= 0) {
      event.preventDefault();
      choose(input, list, list._items[list._activeIndex], kind);
    } else if (event.key === "Escape") {
      setExpanded(input, list, false);
    }
  });
  input.addEventListener("blur", () => window.setTimeout(() => setExpanded(input, list, false), 120));
}

function resolveTyped(kind) {
  const input = kind === "service" ? serviceInput : locationInput;
  const current = kind === "service" ? selectedService : selectedLocation;
  if (current) return current;
  const matches = suggestionsFor(kind, input.value);
  if (!matches.length) return null;
  const firstScore = matchScore(matches[0], input.value);
  const secondScore = matches[1] ? matchScore(matches[1], input.value) : 0;
  if (kind === "service" && firstScore === secondScore && matches[0].type === "specialty" && matches[1]?.type === "specialty") return null;
  return firstScore >= 65 ? matches[0] : null;
}

function destination(service, location) {
  if (service.type === "provider") {
    if (!matchesLocation(service.raw, location)) return null;
    const providerTown = townsByVariant.get(service.raw.townId) || townById.get(service.raw.townId);
    const specialtyId = service.raw.specialtyIds?.[0];
    return `provider.html?id=${encodeURIComponent(service.id)}&town=${encodeURIComponent(providerTown.id)}&category=${encodeURIComponent(service.categoryId)}${specialtyId ? `&specialty=${encodeURIComponent(specialtyId)}` : ""}`;
  }
  const specialtyPart = service.type === "specialty" ? `&specialty=${encodeURIComponent(service.id)}` : "";
  if (location.type === "region") return `towns.html?region=${encodeURIComponent(location.id)}&category=${encodeURIComponent(service.categoryId)}${specialtyPart}`;
  return `providers.html?town=${encodeURIComponent(location.id)}&category=${encodeURIComponent(service.categoryId)}${specialtyPart}`;
}

async function loadSearchData() {
  try {
    const [regions, towns, categories, specialties, providers] = await Promise.all([
      getActiveRegions(), getAllActiveTowns(), getActiveCategories(), getAllActiveSpecialties(), getAllActiveProviders()
    ]);
    regionById = new Map(regions.map(item => [item.id, item]));
    townById = new Map(towns.map(item => [item.id, item]));
    categoryById = new Map(categories.map(item => [item.id, item]));
    townsByVariant = new Map(towns.flatMap(town => townIdVariants(town).map(id => [id, town])));
    serviceItems = [
      ...categories.map((item, index) => ({ ...item, type:"category", typeRank:1, defaultRank:40 - index, categoryId:item.id, raw:item, searchText:searchable(`${item.nameAr} ${item.nameEn || ""} ${categoryAliases[item.id] || ""}`) })),
      ...specialties.map(item => ({ ...item, type:"specialty", typeRank:0, defaultRank:25, raw:item, meta:itemName(categoryById.get(item.categoryId) || {}), searchText:searchable(`${item.nameAr} ${item.nameEn || ""} ${specialtyAliases[item.id] || ""}`) })),
      ...providers.map(item => {
        const town = townsByVariant.get(item.townId);
        return { ...item, type:"provider", typeRank:2, defaultRank:5, raw:item, meta:[town && itemName(town), itemName(categoryById.get(item.categoryId) || {})].filter(Boolean).join(" · "), searchText:searchable(`${item.name || ""} ${item.description || ""}`) };
      })
    ];
    locationItems = [
      ...towns.map(item => ({ ...item, type:"town", typeRank:0, defaultRank:30, raw:item, meta:itemName(regionById.get(item.regionId) || {}), searchText:searchable(`${item.nameAr} ${item.nameEn || ""} ${item.legacyKey || ""}`) })),
      ...regions.map(item => ({ ...item, type:"region", typeRank:1, defaultRank:15, raw:item, searchText:searchable(`${item.nameAr} ${item.nameEn || ""}`) }))
    ];
    ready = true;
    submitButton.disabled = false;
    status.textContent = language() === "en" ? "Start typing and choose from the suggestions." : "بلّش كتابة واختار من الاقتراحات.";
  } catch (error) {
    console.error("Smart search failed", error);
    status.textContent = language() === "en" ? "Search is temporarily unavailable. Browse the categories below." : "تعذّر تجهيز البحث حالياً. فيك تتصفّح الفئات تحت.";
    status.classList.add("is-error");
  }
}

bindCombobox(serviceInput, serviceList, "service");
bindCombobox(locationInput, locationList, "location");
submitButton.disabled = true;

form.addEventListener("submit", event => {
  event.preventDefault();
  if (!ready) return;
  const service = resolveTyped("service");
  const location = resolveTyped("location");
  if (!service) {
    status.textContent = language() === "en" ? "Choose a service, specialty, or business from the suggestions." : "اختار خدمة، اختصاص أو بزنس من الاقتراحات.";
    serviceInput.focus(); refresh(serviceInput, serviceList, "service"); return;
  }
  if (!location) {
    status.textContent = language() === "en" ? "Choose a town or region from the suggestions." : "اختار بلدة أو منطقة من الاقتراحات.";
    locationInput.focus(); refresh(locationInput, locationList, "location"); return;
  }
  const url = destination(service, location);
  if (!url) {
    status.textContent = language() === "en" ? "This provider is not listed in the selected location." : "هيدا البزنس مش مسجّل بالمكان اللي اخترته.";
    return;
  }
  status.textContent = language() === "en" ? "Opening results…" : "عم نفتح النتائج…";
  window.location.assign(url);
});

document.querySelectorAll(".search-examples button").forEach(button => button.addEventListener("click", () => {
  serviceInput.value = button.dataset.service;
  locationInput.value = button.dataset.location;
  selectedService = ranked(serviceItems, serviceInput.value, 1)[0] || null;
  selectedLocation = ranked(locationItems, locationInput.value, 1)[0] || null;
  serviceInput.classList.toggle("has-selection", Boolean(selectedService));
  locationInput.classList.toggle("has-selection", Boolean(selectedLocation));
  form.requestSubmit();
}));

loadSearchData();
