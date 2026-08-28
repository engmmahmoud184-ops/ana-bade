const asciiPart = (value, length) => String(value || "").normalize("NFKD").replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, length);
const two = value => String(value).padStart(2, "0");

export function createPaymentIdentity({ regionId, townId, specialtyId, providerName, phone, regionLabel, townLabel, specialtyLabel, now = new Date() }) {
  const townKey = String(townId || "").split("__").pop();
  const providerPart = asciiPart(providerName, 8) || `TEL${String(phone || "").replace(/\D/g, "").slice(-5) || "00000"}`;
  const stamp = `${String(now.getFullYear()).slice(-2)}${two(now.getMonth() + 1)}${two(now.getDate())}${two(now.getHours())}${two(now.getMinutes())}${two(now.getSeconds())}`;
  const paymentReference = ["AB", asciiPart(regionId, 5), asciiPart(townKey, 6), asciiPart(specialtyId, 6), providerPart, stamp].filter(Boolean).join("-");
  const paymentDescription = ["AnaBade", regionLabel, townLabel, specialtyLabel, providerName].filter(Boolean).join(" | ").slice(0, 300);
  return { paymentReference, paymentDescription };
}
