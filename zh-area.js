// ZippHive serviceable area – one source of truth for the website, booking flow and AI assistant.
// Admin edits it on /areas.html (stored in content/serviceArea). Until it is saved, DEFAULT_AREA applies.
//   pins      – exact 6-digit pincodes we serve
//   prefixes  – pincode starts we serve (e.g. "800" = every 800xxx pincode)
//   blocked   – pincodes we never serve (wins over prefixes)
//   zones     – map circles {name, lat, lng, km}; used when a customer shares GPS location
import { backend } from "/zh-ops.js?v=15";

export const DEFAULT_AREA = {
  city: "Patna",
  prefixes: ["800"],
  pins: ["801103", "801104", "801105", "801503", "801505", "801506"],
  blocked: [],
  zones: [{ name: "Patna", lat: 25.5941, lng: 85.1376, km: 22 }],
  allowGps: true,
  note: "",
};

export function normalizeArea(c) {
  const a = Object.assign({}, DEFAULT_AREA, c || {});
  const pins = (x) => [...new Set((x || []).map((p) => String(p).replace(/\D/g, "")).filter((p) => p.length === 6))].sort();
  a.pins = pins(a.pins);
  a.blocked = pins(a.blocked);
  a.prefixes = [...new Set((a.prefixes || []).map((p) => String(p).replace(/\D/g, "")).filter((p) => p.length >= 2 && p.length <= 5))].sort();
  a.zones = (a.zones || []).filter((z) => isFinite(z.lat) && isFinite(z.lng) && z.km > 0).map((z) => ({ name: String(z.name || "Zone"), lat: +z.lat, lng: +z.lng, km: +z.km }));
  return a;
}

export function checkPin(a, pin) {
  pin = String(pin || "").replace(/\D/g, "");
  if (pin.length !== 6) return { ok: false, reason: "format" };
  if (a.blocked.includes(pin)) return { ok: false, reason: "blocked" };
  if (a.pins.includes(pin)) return { ok: true, how: "pin" };
  if (a.prefixes.some((p) => pin.startsWith(p))) return { ok: true, how: "prefix" };
  return { ok: false, reason: "outside" };
}

export function kmBetween(a, b) {
  const R = 6371, r = (d) => (d * Math.PI) / 180;
  const x = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// nearest zone; ok when inside any zone's radius
export function checkGeo(a, pos) {
  if (!a.allowGps || !a.zones.length) return { ok: false, km: null, zone: null, reason: "gps-off" };
  let best = null;
  for (const z of a.zones) {
    const km = kmBetween(z, pos), inside = km <= z.km;
    if (!best || (inside && !best.inside) || (inside === best.inside && km - z.km < best.km - best.zone.km)) best = { zone: z, km, inside };
  }
  return { ok: best.inside, km: best.km, zone: best.zone };
}

let cache = null;
export function loadArea(force) {
  if (cache && !force) return cache;
  cache = backend()
    .then((be) => (be && be.getServiceArea ? be.getServiceArea() : null))
    .catch(() => null)
    .then((c) => {
      const a = normalizeArea(c);
      window.ZHArea.cfg = a;
      document.dispatchEvent(new CustomEvent("zh-area", { detail: a }));
      return a;
    });
  return cache;
}

// global helper for non-module code (AI assistant, homepage pincode checker)
window.ZHArea = window.ZHArea || {};
Object.assign(window.ZHArea, {
  cfg: normalizeArea(null),
  okPin: (pin) => checkPin(window.ZHArea.cfg, pin).ok,
  checkPin: (pin) => checkPin(window.ZHArea.cfg, pin),
  checkGeo: (pos) => checkGeo(window.ZHArea.cfg, pos),
  ready: null,
});
window.ZHArea.ready = loadArea();
