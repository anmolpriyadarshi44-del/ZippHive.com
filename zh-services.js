// ZippHive service catalog for the booking flow (everything except mobile repair, which uses zipphive-catalog.json).
// Prices are edited by the admin on /pricing.html and saved to Firestore content/services; these are the defaults.
import { backend } from "/zh-ops.js?v=15";

// mode "duration": pick one item, then 30 / 45 / 60 min (each its own price)
// mode "items":     pick one or more items with a quantity; prices can depend on a variant (e.g. Split / Window AC)
export const DEFAULT_SERVICES = {
  version: 1,
  services: [
    {
      id: "cleaning", name: "Home Cleaning", icon: "🧽", badge: "FESTIVE SPECIAL", slotService: "Home Cleaning",
      tagline: "Diwali & Chhath ready – trained cleaners, eco-safe chemicals, all equipment brought along.",
      mode: "duration", durations: [30, 45, 60], otherPrice: 299,
      items: [
        { id: "bathroom", name: "Bathroom cleaning", desc: "Tiles, WC, basin, taps & mirror – deep scrub and descaling", prices: { 30: 349, 45: 499, 60: 649 }, active: true },
        { id: "kitchen", name: "Kitchen cleaning", desc: "Slab, sink, tiles, chimney outside & cabinets outside – degreasing", prices: { 30: 499, 45: 699, 60: 899 }, active: true },
        { id: "sofa", name: "Sofa cleaning", desc: "Vacuum + shampoo – about 3 seats in 30 min, 5 seats in 60 min", prices: { 30: 399, 45: 599, 60: 799 }, active: true },
        { id: "room", name: "Bedroom / living room", desc: "Dusting, cobwebs, fans, switchboards, floor scrubbing", prices: { 30: 299, 45: 449, 60: 599 }, active: true },
        { id: "mattress", name: "Mattress cleaning", desc: "Vacuum & stain treatment – single or double mattress", prices: { 30: 299, 45: 449, 60: 599 }, active: true },
        { id: "carpet", name: "Carpet / rug shampoo", desc: "Deep shampoo & vacuum", prices: { 30: 299, 45: 449, 60: 599 }, active: true },
        { id: "windows", name: "Windows, grills & balcony", desc: "Glass, frames, grills and balcony floor", prices: { 30: 249, 45: 349, 60: 449 }, active: true },
        { id: "appliance", name: "Fridge & appliance cleaning", desc: "Fridge inside/outside, microwave, chimney filter", prices: { 30: 249, 45: 349, 60: 449 }, active: true },
        { id: "combo", name: "Festive combo – kitchen + bathroom", desc: "Our most booked festive pack", prices: { 30: 699, 45: 949, 60: 1199 }, active: true },
      ],
    },
    {
      id: "mobile", name: "Mobile Repair", icon: "📱", badge: "60 MIN", slotService: "Mobile repair",
      tagline: "Screen, battery, charging & more – repaired at your doorstep in about an hour.", mode: "phone",
    },
    {
      id: "ac", name: "AC Repair, Service & Installation", icon: "❄️", slotService: "AC service",
      tagline: "Split & window ACs of all brands – service, gas, repairs, installation and shifting.",
      mode: "items", variants: ["Split AC", "Window AC"], variantLabel: "AC type", qtyLabel: "ACs", otherPrice: 299,
      groups: ["Service & repair", "Installation & shifting"],
      items: [
        { id: "jet", group: "Service & repair", name: "AC jet service (wet)", desc: "Filter, coil & drain cleaning with jet pump", prices: { "Split AC": 599, "Window AC": 499 }, active: true },
        { id: "foam", group: "Service & repair", name: "Foam jet deep service", desc: "Foam + jet deep clean for better cooling", prices: { "Split AC": 899, "Window AC": 799 }, active: true },
        { id: "check", group: "Service & repair", name: "Not cooling – check-up & repair visit", desc: "Diagnosis + labour; parts and gas extra", prices: { "Split AC": 349, "Window AC": 349 }, active: true },
        { id: "gastop", group: "Service & repair", name: "Gas top-up", desc: "Leak check + top-up to correct pressure", prices: { "Split AC": 1499, "Window AC": 1299 }, active: true },
        { id: "gasfull", group: "Service & repair", name: "Gas full refill (R32 / R410)", desc: "Vacuum, leak fix check and full charge", prices: { "Split AC": 2999, "Window AC": 2499 }, active: true },
        { id: "leak", group: "Service & repair", name: "Water leakage fix", desc: "Drain pipe and tray cleaning / re-levelling", prices: { "Split AC": 449, "Window AC": 399 }, active: true },
        { id: "noise", group: "Service & repair", name: "Noise / vibration fix", desc: "Fan, motor mounting and panel check", prices: { "Split AC": 399, "Window AC": 349 }, active: true },
        { id: "pcb", group: "Service & repair", name: "PCB / electrical repair", desc: "Inspection; repair quoted on site", prices: { "Split AC": 499, "Window AC": 449 }, active: true },
        { id: "install", group: "Installation & shifting", name: "AC installation", desc: "Standard fitting with up to 3 ft copper pipe, testing", prices: { "Split AC": 1499, "Window AC": 999 }, active: true },
        { id: "uninstall", group: "Installation & shifting", name: "AC uninstallation", desc: "Safe removal with gas pump-down", prices: { "Split AC": 699, "Window AC": 499 }, active: true },
        { id: "shift", group: "Installation & shifting", name: "AC shifting (uninstall + reinstall)", desc: "Within the same city", prices: { "Split AC": 1999, "Window AC": 1399 }, active: true },
        { id: "stand", group: "Installation & shifting", name: "Outdoor stand / bracket fitting", desc: "Stand price extra if we supply it", prices: { "Split AC": 499, "Window AC": 399 }, active: true },
      ],
    },
    {
      id: "amc", name: "AC AMC Plans", icon: "🛡️", badge: "SAVE", slotService: "AC service",
      tagline: "Yearly AC care: scheduled services, priority breakdown support. Price per AC per year.",
      mode: "items", variants: ["Split AC", "Window AC"], variantLabel: "AC type", qtyLabel: "ACs", single: true,
      items: [
        { id: "basic", name: "Basic Care", desc: "2 wet services a year · filter & coil cleaning · gas pressure check · 10% off repairs", prices: { "Split AC": 1499, "Window AC": 1299 }, active: true },
        { id: "comfort", name: "Comfort Plus", desc: "3 services a year · free breakdown visits · priority same-day support · labour covered on repairs", prices: { "Split AC": 2499, "Window AC": 2199 }, active: true, hot: true },
        { id: "family", name: "Family Pack (2–4 ACs)", desc: "All ACs on one plan · free breakdown visits · priority support · best per-AC price", prices: { "Split AC": 2199, "Window AC": 1899 }, active: true, minQty: 2 },
      ],
    },
    {
      id: "home", name: "Washing Machine, Plumber & Electrician", icon: "🔧", slotService: "Home repair",
      tagline: "Pick what needs fixing – each job has its own fixed price. Parts extra at actual cost.",
      mode: "items", qtyLabel: "qty", otherPrice: 199,
      groups: ["Washing machine", "Plumber", "Electrician"],
      items: [
        { id: "wm-start", group: "Washing machine", name: "Not starting / no power", desc: "Diagnosis & repair labour", price: 349, active: true },
        { id: "wm-spin", group: "Washing machine", name: "Not spinning / drum issue", desc: "Belt, motor, clutch check", price: 399, active: true },
        { id: "wm-drain", group: "Washing machine", name: "Not draining / no water inlet", desc: "Pump, valve & pipe cleaning", price: 349, active: true },
        { id: "wm-leak", group: "Washing machine", name: "Water leakage", desc: "Hose, seal & tub check", price: 349, active: true },
        { id: "wm-noise", group: "Washing machine", name: "Noise / vibration", desc: "Levelling, bearings & shock absorbers", price: 349, active: true },
        { id: "wm-install", group: "Washing machine", name: "Installation (front / top load)", desc: "Inlet, outlet & demo", price: 499, active: true },
        { id: "wm-uninstall", group: "Washing machine", name: "Uninstallation", desc: "Safe removal & packing of pipes", price: 299, active: true },
        { id: "wm-service", group: "Washing machine", name: "Service & descaling", desc: "Drum clean, filter clean, descaling", price: 599, active: true },
        { id: "pl-tap", group: "Plumber", name: "Tap / mixer repair or replace", desc: "Per tap; new tap extra", price: 149, active: true },
        { id: "pl-leak", group: "Plumber", name: "Pipe leakage fix", desc: "Joints, bends & concealed check", price: 249, active: true },
        { id: "pl-block", group: "Plumber", name: "Drain / basin blockage", desc: "Basin, sink, floor drain", price: 299, active: true },
        { id: "pl-flush", group: "Plumber", name: "Flush tank repair", desc: "Cistern, valve & button", price: 349, active: true },
        { id: "pl-basin", group: "Plumber", name: "Wash basin installation", desc: "Fitting & sealing", price: 599, active: true },
        { id: "pl-motor", group: "Plumber", name: "Water motor / pump connection", desc: "Connection & testing", price: 499, active: true },
        { id: "pl-geyser", group: "Plumber", name: "Geyser installation", desc: "Wall mounting & connection", price: 449, active: true },
        { id: "pl-tank", group: "Plumber", name: "Water tank cleaning (up to 1000 L)", desc: "Drain, scrub & disinfect", price: 599, active: true },
        { id: "el-switch", group: "Electrician", name: "Switch / socket replacement", desc: "Per piece; switch extra", price: 99, active: true },
        { id: "el-fan", group: "Electrician", name: "Ceiling fan installation", desc: "Mounting & wiring", price: 249, active: true },
        { id: "el-fanrep", group: "Electrician", name: "Fan repair", desc: "Regulator, capacitor, winding check", price: 299, active: true },
        { id: "el-light", group: "Electrician", name: "Light / tube light installation", desc: "Per light", price: 129, active: true },
        { id: "el-mcb", group: "Electrician", name: "MCB / fuse replacement", desc: "Per MCB; part extra", price: 199, active: true },
        { id: "el-wiring", group: "Electrician", name: "Wiring fault check & fix", desc: "Short circuit / no power in a room", price: 349, active: true },
        { id: "el-inverter", group: "Electrician", name: "Inverter installation", desc: "Inverter + battery connection", price: 549, active: true },
        { id: "el-bell", group: "Electrician", name: "Doorbell installation", desc: "Wired or wireless", price: 149, active: true },
      ],
    },
  ],
};

// Sample MRPs for the defaults (≈35% above the price, ending in 49/99) – the admin sets real MRPs on /pricing.html
const sampleMrp = (p) => (p > 0 ? Math.ceil((p * 1.35) / 50) * 50 - 1 : 0);
for (const s of DEFAULT_SERVICES.services) for (const it of s.items || []) {
  if (it.prices) it.mrps = Object.fromEntries(Object.entries(it.prices).map(([k, v]) => [k, sampleMrp(v)]));
  else if (it.price) it.mrp = sampleMrp(it.price);
}

export const svcById = (cat, id) => (cat.services || []).find((s) => s.id === id);
// MRP (strike-through price) of one item for a variant / duration; 0 = no MRP set
export function itemMrp(svc, item, key) {
  if (svc.mode === "duration" || svc.variants?.length) return Number(item.mrps?.[key]) || 0;
  return Number(item.mrp) || 0;
}
// "% off" shown to customers: (MRP − price) ÷ MRP, rounded
export const offPct = (mrp, price) => (mrp > 0 && price > 0 && mrp > price ? Math.round((1 - price / mrp) * 100) : 0);
// price of one item for a variant / duration
export function itemPrice(svc, item, key) {
  if (svc.mode === "duration") return Number(item.prices?.[key]) || 0;
  if (svc.variants?.length) return Number(item.prices?.[key]) || 0;
  return Number(item.price) || 0;
}

// Stored catalog (admin edits) merged over the defaults: services the admin saved replace the defaults,
// services they never touched (or new ones added in code) keep the defaults.
export function mergeCatalog(stored) {
  const base = structuredClone(DEFAULT_SERVICES);
  if (!stored || !Array.isArray(stored.services)) return base;
  const byId = Object.fromEntries(stored.services.map((s) => [s.id, s]));
  base.services = base.services.map((s) => (byId[s.id] ? { ...s, ...byId[s.id], mode: s.mode } : s));
  return base;
}

let cache = null;
export function loadServices(force) {
  if (cache && !force) return cache;
  cache = backend()
    .then((be) => (be && be.getServiceCatalog ? be.getServiceCatalog() : null))
    .catch(() => null)
    .then(mergeCatalog);
  return cache;
}

// Cheapest active option and best discount of a service, for "from ₹X · up to Y% off" labels
export function svcStats(s) {
  let min = 0, off = 0;
  for (const it of s.items || []) {
    if (it.active === false) continue;
    const keys = s.mode === "duration" ? s.durations : s.variants?.length ? s.variants : [null];
    for (const k of keys) {
      const p = itemPrice(s, it, k), m = itemMrp(s, it, k);
      if (p > 0 && (!min || p < min)) min = p;
      off = Math.max(off, offPct(m, p));
    }
  }
  return { min, off };
}
// Brand accent per service (hexagon icon colours)
export const SVC_TONE = {
  cleaning: { tint: "#FFF4CC", ink: "#8A5A00" }, mobile: { tint: "#ECE8FD", ink: "#5B3FD1" },
  ac: { tint: "#E2F1FB", ink: "#1769AA" }, amc: { tint: "#E6F4F3", ink: "#0B6E6E" }, home: { tint: "#E4F5EC", ink: "#1E7B4F" },
};
// Photos for the cleaning cards. Own ZippHive photos live in /zh-img/ (teal uniform, yellow gloves – see README);
// items without one yet use an Unsplash stock photo (free licence) with a teal brand tint. Admin can override any item with an "img" URL.
const U = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&q=70`;
export const CLEAN_IMG = {
  bathroom: U("1714479120969-436c216a3cd4"), kitchen: U("1736433622548-4adbbc1c2cf2"), sofa: U("1686178827149-6d55c72d81df"),
  room: "/zh-img/clean-living-room.jpg", mattress: U("1597665863042-47e00964d899"), carpet: U("1527515637462-cff94eecc1ac"),
  windows: U("1581578731548-c64695cc6952"), appliance: U("1484154218962-a197022b5858"), combo: U("1646980241033-cd7abda2ee88"),
  other: U("1583847268964-b28dc8f51f92"),
};
export const CLEAN_EMOJI = { bathroom: "🚿", kitchen: "🍳", sofa: "🛋️", room: "🛏️", mattress: "🛌", carpet: "🧶", windows: "🪟", appliance: "🧊", combo: "🪔", other: "🏠" };
export const isStock = (src) => /images\.unsplash\.com/.test(src || "");
export function itemImg(it, w = 600) {
  const src = (it && it.img) || CLEAN_IMG[it && it.id] || CLEAN_IMG.other;
  return src.includes("images.unsplash.com") ? src.replace(/([?&])w=\d+&?/, "$1") + `&w=${w}` : src;
}
// Cheapest active duration of a cleaning item → { d, price, mrp }
export function itemFrom(s, it) {
  const d = (s.durations || []).filter((x) => itemPrice(s, it, x) > 0).sort((a, b) => itemPrice(s, it, a) - itemPrice(s, it, b))[0];
  return d ? { d, price: itemPrice(s, it, d), mrp: itemMrp(s, it, d) } : null;
}
