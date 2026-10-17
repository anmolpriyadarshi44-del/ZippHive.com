// Anonymous website funnel tracking. Each event is counted at most once per browser per day,
// so the numbers mean "how many visitors reached this step today". No names, numbers or IDs are stored.
// Read on /analytics.html (Admin → Website analytics).
import { backend } from "/zh-ops.js?v=19";

const ymd = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const isStaff = () => { try { return localStorage.getItem("zh-admin") === "1" || localStorage.getItem("zh-staff") === "1"; } catch { return false; } };
let bePromise = null;

export function track(ev) {
  ev = String(ev || "").toLowerCase().replace(/[^a-z0-9_]/g, "_").slice(0, 40);
  if (ev.length < 2 || isStaff() || /bot|crawl|spider|lighthouse|headless/i.test(navigator.userAgent)) return;
  const day = ymd(), k = `zhs:${day}:${ev}`;
  try { if (localStorage.getItem(k)) return; localStorage.setItem(k, "1"); } catch { return; }
  bePromise ||= backend();
  bePromise.then((be) => be && be.bumpStat && be.bumpStat(day, ev)).catch(() => {});
}
window.ZHTrack = track;

// page visit + generic clicks (WhatsApp, call, AI assistant)
const page = location.pathname.replace(/^\/|\.html$/g, "") || "home";
track("visit");
track("visit_" + (page === "index" ? "home" : page));
const ref = document.referrer && !document.referrer.includes(location.host) ? new URL(document.referrer).hostname.replace(/^www\./, "") : "";
const src = new URLSearchParams(location.search).get("utm_source");
track("src_" + (src || (/google/.test(ref) ? "google" : /facebook|instagram|fb\./.test(ref) ? "social" : /whatsapp|wa\.me/.test(ref) ? "whatsapp" : ref ? "other" : "direct")));
document.addEventListener("click", (e) => {
  const path = e.composedPath ? e.composedPath() : [e.target];
  for (const el of path) {
    if (!el || !el.getAttribute) continue;
    const href = el.getAttribute("href") || "";
    if (/wa\.me|whatsapp/.test(href)) return track("click_whatsapp");
    if (href.startsWith("tel:")) return track("click_call");
    if (el.classList && el.classList.contains("zh-launch")) return track("ai_open");
  }
}, true);
