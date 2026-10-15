// ZippHive time slots: calendar date + hourly slot picker for bookings, and the shared slot rules.
// Settings live in Firestore content/slots (edited on /slots.html); usage counters in slotUse/{date}.
// Used by the homepage booking form and the AI assistant's booking forms (<zh-slot-picker service="…">).
import { backend } from "/zh-ops.js?v=15";

export const SLOT_CATS = [
  { id: "phone", label: "Mobile repair", dur: 60 },
  { id: "cleaning", label: "Cleaning", dur: 45 },
  { id: "home", label: "Home services", hint: "AC, washing machine, plumber, electrician", dur: 60 },
];
export const slotCat = (service) => {
  const s = String(service || "").toLowerCase();
  if (!s) return "";
  if (/clean/.test(s)) return "cleaning";
  if (/mobile|phone|iphone|samsung|screen|battery/.test(s)) return "phone";
  return "home";
};
export const DEFAULT_SLOTS = {
  open: 9, close: 19, days: 7, leadMins: 60, closedDays: [],
  cap: {}, // { "0900": { phone: 2, cleaning: 4, home: 2 } } — missing hour uses defCap
  defCap: { phone: 2, cleaning: 4, home: 2 },
  dates: {}, // { "2026-10-20": { closed: true } | { cap: {...} } }
};
export const hm = (h) => String(h).padStart(2, "0") + "00";
export const hours = (c) => { const a = []; for (let h = c.open; h < c.close; h++) a.push(hm(h)); return a; };
export const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const fromYmd = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
export const nextDays = (n) => { const t = new Date(); t.setHours(0, 0, 0, 0); return Array.from({ length: n }, (_, i) => ymd(new Date(t.getFullYear(), t.getMonth(), t.getDate() + i))); };
export function mergeCfg(c) {
  const x = { ...DEFAULT_SLOTS, ...(c || {}) };
  x.defCap = { ...DEFAULT_SLOTS.defCap, ...(c?.defCap || {}) };
  x.cap = { ...(c?.cap || {}) };
  for (const h of hours(x)) x.cap[h] = { ...x.defCap, ...(x.cap[h] || {}) };
  x.dates = { ...(c?.dates || {}) };
  x.closedDays = c?.closedDays || [];
  return x;
}
const clock = (mins) => { let h = Math.floor(mins / 60), m = mins % 60; const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return { t: `${h}:${String(m).padStart(2, "0")}`, ap }; };
export function slotLabel(h, cat, mins) {
  const start = Number(h.slice(0, 2)) * 60, dur = Number(mins) || SLOT_CATS.find((c) => c.id === cat)?.dur || 60;
  const a = clock(start), b = clock(start + dur);
  return a.ap === b.ap ? `${a.t}–${b.t} ${b.ap}` : `${a.t} ${a.ap}–${b.t} ${b.ap}`;
}
export const dayLabel = (date) => fromYmd(date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
export const isDayClosed = (cfg, date) => !!cfg.dates[date]?.closed || cfg.closedDays.includes(fromYmd(date).getDay());
export const capFor = (cfg, date, h, cat) => (isDayClosed(cfg, date) ? 0 : Number((cfg.dates[date]?.cap || cfg.cap)[h]?.[cat] ?? cfg.defCap[cat] ?? 0) || 0);

// Slots of one day for one category: [{ h, label, cap, used, left, past, key }]
export function daySlots(cfg, use, date, cat, now = Date.now()) {
  return hours(cfg).map((h) => {
    const cap = capFor(cfg, date, h, cat), used = Number(use?.[date]?.[`${cat}_${h}`] || 0);
    const at = fromYmd(date).getTime() + Number(h.slice(0, 2)) * 3600e3;
    const past = at - now < (cfg.leadMins || 0) * 60e3;
    return { h, label: slotLabel(h, cat), cap, used, left: Math.max(0, cap - used), past, key: `${date}/${cat}_${h}` };
  });
}
// Before a service is chosen: an hour is open if any service still has room in it
export function anySlots(cfg, use, date, now = Date.now()) {
  const per = SLOT_CATS.map((c) => daySlots(cfg, use, date, c.id, now));
  return per[0].map((x, i) => {
    const best = per.reduce((a, l) => (l[i].left > a.left ? l[i] : a), per[0][i]);
    return { ...x, cap: Math.max(...per.map((l) => l[i].cap)), left: best.left, label: slotLabel(x.h, "phone"), key: "" };
  });
}
export const slotText = (date, h, cat, mins) => `${dayLabel(date)}, ${slotLabel(h, cat, mins)}`; // stored as booking.time (≤ 40 chars)
export const NO_SLOT = "No slot free – please call me";

let cache = null;
export async function loadSlots(force) {
  if (cache && !force && Date.now() - cache.at < 45e3) return cache;
  const be = await backend();
  let raw = null;
  try { raw = be ? await be.getSlotConfig() : null; } catch {}
  const cfg = mergeCfg(raw);
  let use = {};
  try { use = be ? await be.getSlotUse(nextDays(cfg.days)) : {}; } catch {}
  cache = { cfg, use, at: Date.now(), be };
  return cache;
}
// Is this slot still free right now? (checked again just before booking)
export async function stillFree(key) {
  const [date, k] = key.split("/"), [cat, h] = k.split("_");
  const { cfg, use } = await loadSlots(true);
  const s = daySlots(cfg, use, date, cat).find((x) => x.h === h);
  return !!s && !s.past && s.left > 0;
}
export async function reserve(key) { const be = await backend(); return be && be.bumpSlot ? be.bumpSlot(key, 1) : null; }

// time text → slot key, for the AI assistant's booking forms (they only pass the time text)
const picked = {};
window.ZHSlots = {
  take: (time) => picked[time] || "",
  reserve: (key) => reserve(key).catch(() => {}),
  stillFree,
};

// ---------- <zh-slot-picker service="Home Cleaning"> ----------
const CSS = `
:host{display:block;font-family:inherit;color:#0F2424}
.days{display:flex;gap:8px;overflow-x:auto;padding:2px 2px 8px;scrollbar-width:thin}
.day{flex:0 0 auto;width:62px;border:2px solid #DCE8E7;background:#fff;border-radius:12px;padding:6px 4px 7px;text-align:center;cursor:pointer;font:inherit;color:inherit;line-height:1.15}
.day small{display:block;font-size:11px;font-weight:700;color:#5B6F6F;text-transform:uppercase;letter-spacing:.03em}
.day b{display:block;font-size:20px;font-weight:800;color:#053E40;margin:2px 0}
.day i{display:block;font-style:normal;font-size:10.5px;font-weight:700;color:#1E8E3E}
.day.full i{color:#C62828}
.day.on{border-color:#0B7F7D;background:#0B7F7D;color:#fff}
.day.on small,.day.on b,.day.on i{color:#fff}
.day:disabled{opacity:.45;cursor:not-allowed}
.times{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:7px;margin-top:4px}
.t{border:2px solid #DCE8E7;background:#fff;border-radius:10px;padding:7px 6px;font:inherit;font-size:13.5px;font-weight:700;color:#053E40;cursor:pointer;text-align:center;line-height:1.2}
.t small{display:block;font-size:11px;font-weight:600;color:#1E8E3E;margin-top:2px}
.t.low small{color:#B26A00}
.t.on{border-color:#0B7F7D;background:#E8F5F4;box-shadow:0 0 0 2px #0B7F7D inset}
.t:disabled{opacity:.42;cursor:not-allowed;text-decoration:line-through}
.t:disabled small{color:#8A8A8A;text-decoration:none}
.sel{margin-top:9px;font-size:13.5px;font-weight:700;color:#053E40;background:#FFF6D9;border-radius:9px;padding:7px 10px}
.msg{font-size:13.5px;color:#5B6F6F;padding:8px 2px}
.msg.warn{color:#8A5A00;background:#FFF6D9;border-radius:9px;padding:8px 10px}
`;
class SlotPicker extends HTMLElement {
  static get observedAttributes() { return ["service", "dur"]; }
  get dur() { return Number(this.getAttribute("dur")) || 0; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this.state = { data: null, date: "", h: "" };
    this.value = ""; this.slotKey = "";
    this.shadowRoot.addEventListener("click", (e) => this.click(e));
  }
  connectedCallback() {
    this.render();
    this.load();
    this.timer = setInterval(() => this.load(true), 60e3);
  }
  disconnectedCallback() { clearInterval(this.timer); }
  attributeChangedCallback() { if (this.state.data) this.choose(true); }
  get cat() { return slotCat(this.getAttribute("service")) || ""; }
  async load(force) {
    try { this.state.data = await loadSlots(force); } catch { this.state.data = { cfg: mergeCfg(null), use: {} }; }
    this.choose();
  }
  refresh() { return this.load(true); }
  days() {
    const { cfg, use } = this.state.data;
    const list = nextDays(cfg.days).map((d) => {
      const s = this.cat ? daySlots(cfg, use, d, this.cat) : anySlots(cfg, use, d), open = s.filter((x) => !x.past && x.left > 0).length;
      return { d, open, closed: isDayClosed(cfg, d), s };
    });
    // today has no slots left → start the calendar from tomorrow
    if (list.length > 4 && !list[0].open) list.shift();
    return list;
  }
  // keep the current choice if still free, otherwise pick the earliest free slot
  choose(reset) {
    const days = this.days();
    let day = days.find((x) => x.d === this.state.date && !reset) || days.find((x) => x.d === this.state.date);
    const ok = (x) => x && !x.past && x.left > 0;
    if (!day || !day.open) day = days.find((x) => x.open) || null;
    let slot = day && day.s.find((x) => x.h === this.state.h && ok(x));
    if (!slot && day) slot = day.s.find(ok);
    this.state.date = day ? day.d : (days[0]?.d || "");
    this.set(day ? day.d : "", slot ? slot.h : "");
    this.render();
  }
  set(date, h) {
    const cat = this.cat;
    this.state.h = h;
    const val = date && h ? slotText(date, h, cat || "phone", this.dur) : NO_SLOT;
    const key = date && h && cat ? `${date}/${cat}_${h}` : ""; // counted only once the service is known
    if (val === this.value && key === this.slotKey) return;
    this.value = val; this.slotKey = key;
    if (key) picked[val] = key;
    try { this.onpick && this.onpick(val, key); } catch {}
    this.dispatchEvent(new CustomEvent("change", { bubbles: true, composed: true, detail: { value: val, slot: key } }));
  }
  click(e) {
    const b = e.target.closest("button");
    if (!b || b.disabled) return;
    e.preventDefault();
    if (b.dataset.d) {
      this.state.date = b.dataset.d;
      const day = this.days().find((x) => x.d === b.dataset.d);
      const first = day.s.find((x) => !x.past && x.left > 0);
      this.set(day.d, first ? first.h : "");
    } else if (b.dataset.h) this.set(this.state.date, b.dataset.h);
    this.render();
  }
  render() {
    const r = this.shadowRoot;
    if (!this.state.data) { r.innerHTML = `<style>${CSS}</style><div class="msg">Loading open slots…</div>`; return; }
    const keep = r.querySelector(".days")?.scrollLeft || 0;
    const days = this.days(), today = nextDays(2);
    if (!days.length) { r.innerHTML = `<style>${CSS}</style><div class="msg">Loading open slots…</div>`; return; }
    const day = days.find((x) => x.d === this.state.date) || days[0];
    const cat = SLOT_CATS.find((c) => c.id === this.cat) || { id: "", label: "service" };
    const dayBtn = (x) => {
      const dt = fromYmd(x.d);
      const top = x.d === today[0] ? "Today" : x.d === today[1] ? "Tmrw" : dt.toLocaleDateString("en-IN", { weekday: "short" });
      return `<button type="button" class="day ${x.d === day.d ? "on" : ""} ${x.open ? "" : "full"}" data-d="${x.d}" ${x.open ? "" : "disabled"} aria-label="${dayLabel(x.d)}${x.open ? "" : " – no slots"}">
        <small>${top}</small><b>${dt.getDate()}</b><small>${dt.toLocaleDateString("en-IN", { month: "short" })}</small><i>${x.closed ? "Closed" : x.open ? `${x.open} open` : x.d === today[0] ? "Over" : "Full"}</i></button>`;
    };
    const times = day.s.filter((x) => x.cap > 0).map((x) => {
      const ok = !x.past && x.left > 0;
      return `<button type="button" class="t ${x.h === this.state.h && ok ? "on" : ""} ${ok && x.left === 1 ? "low" : ""}" data-h="${x.h}" ${ok ? "" : "disabled"}>${this.dur ? slotLabel(x.h, this.cat, this.dur) : x.label}<small>${x.past ? "Not available" : x.left && !this.cat ? "Open" : x.left ? (x.left === 1 ? "1 slot left" : `${x.left} slots left`) : "Full"}</small></button>`;
    }).join("");
    r.innerHTML = `<style>${CSS}</style>
      <div class="days" role="group" aria-label="Choose a date">${days.map(dayBtn).join("")}</div>
      ${!days.some((x) => x.open) ? `<div class="msg warn">All ${cat.label.toLowerCase()} slots for the next ${days.length} days are booked. Book anyway and we'll call you with the earliest time.</div>`
        : times ? `<div class="times" role="group" aria-label="Choose a time">${times}</div>` : `<div class="msg">No slots on this day.</div>`}
      ${this.slotKey ? `<div class="sel">📅 ${this.value}${cat.id === "cleaning" ? ` · ${this.dur || 45} min` : ""}</div>`
        : this.state.h ? `<div class="sel">📅 ${this.value} <span style="font-weight:600;color:#8A5A00">· choose your service to confirm this slot</span></div>` : ""}`;
    const strip = r.querySelector(".days");
    if (strip) strip.scrollLeft = keep;
  }
}
if (!customElements.get("zh-slot-picker")) customElements.define("zh-slot-picker", SlotPicker);
