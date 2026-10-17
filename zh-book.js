// ZippHive step-by-step booking: service → choices → price → time slot → details → confirmed.
// Mounts into <div id="zhBook">. Mobile repair uses zipphive-catalog.json (+ admin price overrides);
// all other services use zh-services.js (prices edited on /pricing.html).
import { backend, trackUrl } from "/zh-ops.js?v=19";
import { loadServices, svcById, itemPrice, itemMrp, offPct, svcStats, SVC_TONE, itemImg, itemFrom, CLEAN_EMOJI, isStock, svcItemImg, variantImg, issueImg, SVC_COVER } from "/zh-services.js?v=27";
import "/zh-slots.js?v=15";
import { track } from "/zh-stats.js?v=1";
import { checkPin, checkGeo } from "/zh-area.js?v=5";

const root = document.getElementById("zhBook");
// Service area comes from Admin → Service area (/areas.html, content/serviceArea) via zh-area.js:
// served pincodes / pincode prefixes, blocked pincodes, and map zones for "Use my location".
const AREA = () => window.ZHArea.cfg;
const pinOk = (p) => checkPin(AREA(), p).ok;
const NOTIFY = `https://wa.me/919220400950?text=${encodeURIComponent("Hi ZippHive, please tell me when you start in my city: ")}`;
const ISSUE_ICON = { 1: "📱", 2: "📖", 3: "🪟", 4: "🔗", 5: "🔋", 6: "✨", 7: "🔌", 8: "📷", 9: "🔄", 10: "💥", 11: "💧", 12: "🔊", 13: "🎙️", 14: "🙂", 15: "👆", 16: "📶", 17: "🔘", 18: "📞", 19: "📳", 20: "🛠️", 21: "🧩", 22: "🛡️" };
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const rs = (n) => (n == null ? "" : "₹" + Number(n).toLocaleString("en-IN"));
const cut = (s, n) => String(s || "").slice(0, n);
// price with struck-through MRP and auto "% OFF"
const tag = (price, mrp) => `${rs(price)}${mrp > price && price > 0 ? `<s>${rs(mrp)}</s><em class="off">${offPct(mrp, price)}% OFF</em>` : ""}`;

const CSS = `
#zhBook{--t:#0B6E6E;--td:#074848;--tl:#E6F4F3;--y:#FFC93C;--ink:#0F1F1F;--mu:#506363;--ln:#DCE8E7;font-size:15px}
#zhBook *{box-sizing:border-box}
#zhBook .zb-top{display:flex;align-items:center;gap:8px;margin-bottom:14px}
#zhBook .zb-back{border:1.5px solid var(--ln);background:#fff;border-radius:999px;width:36px;height:36px;font-size:18px;cursor:pointer;flex:none}
#zhBook .zb-prog{flex:1;display:flex;gap:4px}
#zhBook .zb-prog i{flex:1;height:5px;border-radius:5px;background:var(--ln)}
#zhBook .zb-prog i.on{background:var(--t)}
#zhBook h3{font-size:20px;margin:0 0 4px;color:var(--td)}
#zhBook .zb-sub{color:var(--mu);font-size:14px;margin:0 0 14px}
#zhBook .zb-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
#zhBook .zb-grid.three{grid-template-columns:repeat(3,minmax(0,1fr))}
#zhBook .zb-pics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
#zhBook .zb-pic{display:flex;flex-direction:column;text-align:left;border:0;background:none;padding:0;cursor:pointer;font:inherit;color:var(--ink)}
#zhBook .zb-pic .ph{position:relative;display:block;aspect-ratio:1/1;border-radius:18px;overflow:hidden;background:linear-gradient(140deg,#E6F4F3,#FFF4CC)}
#zhBook .zb-pic .ph::before{content:attr(data-e);position:absolute;inset:0;display:grid;place-items:center;font-size:40px}
#zhBook .zb-pic .ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transition:transform .4s}
#zhBook .zb-pic:hover .ph img{transform:scale(1.06)}
#zhBook .zb-pic .ph::after{content:"";position:absolute;inset:auto 0 0 0;height:40%;background:linear-gradient(transparent,rgba(4,47,49,.35))}
#zhBook .zb-pic .ph.st::after{inset:0;height:auto;background:linear-gradient(180deg,rgba(11,110,110,.22),rgba(4,47,49,.38))}
#zhBook .zb-pic .ph img{object-position:center 25%}
#zhBook .zb-pic .ph em{position:absolute;z-index:1;left:8px;top:8px;font-style:normal;font-size:10.5px;font-weight:800;background:var(--y,#FFC93C);color:#3A2A00;border-radius:999px;padding:3px 8px}
#zhBook .zb-pic .ph i{position:absolute;z-index:1;right:8px;top:8px;font-style:normal;font-size:10.5px;font-weight:800;background:#042F31;color:#fff;border-radius:999px;padding:3px 8px}
#zhBook .zb-pic b{display:block;font-size:14px;line-height:1.25;margin:8px 2px 2px}
#zhBook .zb-pic .fr{font-size:12.5px;color:var(--mu);margin:0 2px}
#zhBook .zb-pic .fr strong{color:var(--td);font-weight:800}
#zhBook .zb-pic .fr s{color:#9AA9A9;margin-left:5px}
#zhBook .zb-pic.wide{grid-column:span 2}
#zhBook .zb-pic.wide .ph{aspect-ratio:auto;flex:1;min-height:0}
#zhBook .zb-pic:focus-visible .ph{outline:3px solid var(--t);outline-offset:2px}
#zhBook .zb-banner{position:relative;border-radius:18px;overflow:hidden;min-height:150px;display:flex;align-items:flex-end;margin-bottom:14px;background:linear-gradient(140deg,#0B6E6E,#042F31)}
#zhBook .zb-banner::before{content:attr(data-e);position:absolute;right:18px;top:12px;font-size:48px;opacity:.5}
#zhBook .zb-banner img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
#zhBook .zb-banner::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(4,47,49,0) 20%,rgba(4,47,49,.88))}
#zhBook .zb-banner div{position:relative;z-index:1;padding:14px 16px;color:#fff}
#zhBook .zb-banner h3{color:#fff;margin:0 0 2px}
#zhBook .zb-banner p{margin:0;font-size:13px;opacity:.9}
#zhBook .zb-hex img{width:100%;height:100%;object-fit:cover}
#zhBook .zb-th{flex:none;width:64px;height:64px;border-radius:14px;overflow:hidden;background:linear-gradient(140deg,#E6F4F3,#FFF4CC)}
#zhBook .zb-th img{width:100%;height:100%;object-fit:cover;display:block}
#zhBook .zb-art{display:block;aspect-ratio:1/1;border-radius:12px;overflow:hidden;margin:-2px -2px 8px;background:linear-gradient(140deg,#E6F4F3,#FFF4CC)}
#zhBook .zb-art img{width:100%;height:100%;object-fit:cover;display:block}
@media (max-width:440px){#zhBook .zb-th{width:54px;height:54px;border-radius:12px}}
@media (max-width:520px){#zhBook .zb-pics{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}#zhBook .zb-pic.wide .ph{aspect-ratio:2/1;flex:none}}
#zhBook .zb-opt{position:relative;text-align:left;border:1.5px solid var(--ln);background:#fff;border-radius:14px;padding:12px;cursor:pointer;font:inherit;color:var(--ink);transition:border-color .15s,box-shadow .15s}
#zhBook .zb-opt:hover{border-color:var(--t);box-shadow:0 4px 14px rgba(7,72,72,.08)}
#zhBook .zb-opt.on{border-color:var(--t);background:var(--tl);box-shadow:0 0 0 1.5px var(--t) inset}
#zhBook .zb-opt b{display:block;font-size:14.5px;line-height:1.3}
#zhBook .zb-opt small{display:block;color:var(--mu);font-size:12.5px;line-height:1.35;margin-top:3px}
#zhBook .zb-opt .ic{font-size:24px;display:block;margin-bottom:6px}
#zhBook .zb-opt .pr{display:block;margin-top:6px;font-weight:800;color:var(--td)}
#zhBook .zb-opt .pr s,#zhBook .zb-row .pr s,#zhBook .zb-dur s,#zhBook .zb-sum s{color:#9AA9A9;font-weight:500;margin-left:6px;font-size:.9em}
#zhBook .off{display:inline-block;font-style:normal;background:#E6F4EA;color:#1E8E3E;font-weight:800;font-size:11px;border-radius:6px;padding:1px 6px;margin-left:6px;vertical-align:1px}
#zhBook .zb-dur .off{display:block;margin:4px auto 0;width:max-content}
#zhBook .zb-sum .save{color:#1E8E3E;font-weight:700}
#zhBook .zb-badge{position:absolute;top:-8px;right:10px;background:var(--y);color:var(--ink);font-size:10.5px;font-weight:800;padding:2px 8px;border-radius:999px;letter-spacing:.03em}
#zhBook .zb-svc{display:flex;gap:12px;align-items:center;padding:14px}
#zhBook .zb-svc .ic{margin:0;font-size:28px}
#zhBook .zb-svc.feat{border-color:var(--y);background:#FFFBEA}
#zhBook .zb-list{display:flex;flex-direction:column;gap:8px}
#zhBook .zb-row{display:flex;align-items:center;gap:10px;border:1.5px solid var(--ln);border-radius:14px;padding:11px 12px;background:#fff}
#zhBook .zb-row.on{border-color:var(--t);background:var(--tl)}
#zhBook .zb-row .tx{flex:1;min-width:0}
#zhBook .zb-row .tx b{display:block;font-size:14.5px;line-height:1.3}
#zhBook .zb-row .tx small{display:block;color:var(--mu);font-size:12.5px;line-height:1.35}
#zhBook .zb-row .pr{font-weight:800;color:var(--td);white-space:nowrap}
#zhBook .zb-add{border:1.5px solid var(--t);color:var(--t);background:#fff;border-radius:10px;padding:6px 14px;font-weight:800;cursor:pointer;font:inherit;font-weight:800}
#zhBook .zb-qty{display:inline-flex;align-items:center;border:1.5px solid var(--t);border-radius:10px;overflow:hidden}
#zhBook .zb-qty button{border:0;background:var(--t);color:#fff;width:30px;height:32px;font-size:17px;cursor:pointer}
#zhBook .zb-qty span{min-width:28px;text-align:center;font-weight:800}
#zhBook .zb-grp{font-size:12.5px;font-weight:800;color:var(--mu);text-transform:uppercase;letter-spacing:.05em;margin:12px 2px 2px}
#zhBook .zb-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
#zhBook .zb-tabs button{border:1.5px solid var(--ln);background:#fff;border-radius:999px;padding:7px 14px;font:inherit;font-size:13.5px;font-weight:700;cursor:pointer}
#zhBook .zb-tabs button.on{background:var(--t);border-color:var(--t);color:#fff}
#zhBook .zb-dur{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}
#zhBook .zb-dur button{border:1.5px solid var(--ln);background:#fff;border-radius:12px;padding:10px 6px;font:inherit;cursor:pointer;text-align:center}
#zhBook .zb-dur button b{display:block;font-size:15px}
#zhBook .zb-dur button span{display:block;font-weight:800;color:var(--td);margin-top:2px}
#zhBook .zb-dur button.on{border-color:var(--t);background:var(--tl);box-shadow:0 0 0 1.5px var(--t) inset}
#zhBook input,#zhBook textarea,#zhBook select{width:100%;border:1.5px solid var(--ln);border-radius:12px;padding:11px 12px;font:inherit;background:#F6FAF9}
#zhBook input:focus,#zhBook textarea:focus{outline:none;border-color:var(--t);background:#fff}
#zhBook label{display:block;font-size:13px;font-weight:700;margin:10px 0 5px}
#zhBook .zb-search{margin-bottom:10px}
#zhBook .zb-models{max-height:340px;overflow:auto;padding-right:2px}
#zhBook .zb-ser{font-size:12px;font-weight:800;color:var(--mu);margin:10px 2px 6px;text-transform:uppercase;letter-spacing:.04em}
#zhBook .zb-other{border-style:dashed}
#zhBook .zb-sum{margin-top:14px;border-radius:14px;background:#F6FAF9;border:1px solid var(--ln);padding:12px 14px;font-size:13.5px}
#zhBook .zb-sum .ln{display:flex;justify-content:space-between;gap:10px;margin:2px 0}
#zhBook .zb-sum .tot{font-size:16px;font-weight:800;color:var(--td);border-top:1px dashed var(--ln);margin-top:6px;padding-top:6px}
#zhBook .zb-cta{width:100%;margin-top:14px;border:0;border-radius:999px;background:var(--y);color:var(--ink);font:inherit;font-weight:800;font-size:16px;padding:14px;cursor:pointer;box-shadow:0 8px 20px rgba(242,178,0,.35)}
#zhBook .zb-cta:disabled{opacity:.45;cursor:not-allowed;box-shadow:none}
#zhBook .zb-err{color:#C62828;font-size:13.5px;font-weight:600;margin-top:8px}
#zhBook .zb-note{color:var(--mu);font-size:12.5px;margin-top:8px;text-align:center}
#zhBook .zb-done{text-align:center}
#zhBook .zb-done .tick{width:64px;height:64px;border-radius:50%;background:var(--tl);color:var(--t);display:grid;place-items:center;font-size:32px;margin:0 auto 10px}
#zhBook .zb-done .bid{background:#F6FAF9;border:1px dashed var(--t);border-radius:12px;padding:10px;margin:12px 0;font-size:15px}
#zhBook .zb-load{padding:30px 0;text-align:center;color:var(--mu)}
/* ---- refreshed look ---- */
#zhBook h3{font-size:22px;letter-spacing:-.02em}
#zhBook .zb-prog i{height:6px;transition:background .3s}
#zhBook .zb-prog i.on{background:linear-gradient(90deg,var(--t),#14A3A0)}
#zhBook .zb-svc{gap:14px;padding:14px 16px 14px 14px;border-radius:18px;align-items:center;transition:transform .2s,box-shadow .2s,border-color .2s}
#zhBook .zb-svc:hover{transform:translateY(-2px);box-shadow:0 12px 26px -16px rgba(7,72,72,.5)}
#zhBook .zb-hex{flex:none;width:48px;height:54px;display:grid;place-items:center;font-size:24px;background:var(--tn,#E6F4F3);clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)}
#zhBook .zb-svc .tx{flex:1;min-width:0;display:block}
#zhBook .zb-svc .tx b{font-size:15.5px}
#zhBook .zb-svc .zb-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}
#zhBook .zb-svc .zb-meta span{font-size:11.5px;font-weight:800;border-radius:6px;padding:2px 8px;background:#F1F5F5;color:var(--ink)}
#zhBook .zb-svc .zb-meta .o{background:#DDF3E6;color:#1E7B4F}
#zhBook .zb-svc .chev{flex:none;width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#F1F5F5;color:var(--td);font-size:18px;transition:background .2s,transform .2s}
#zhBook .zb-svc:hover .chev{background:var(--y);transform:translateX(2px)}
#zhBook .zb-svc.feat{background:radial-gradient(120% 140% at 100% 0%,#0E8A87 0%,#0B6E6E 40%,#053E40 100%);border:0;color:#fff}
#zhBook .zb-svc.feat .tx small{color:#CFE9E7}
#zhBook .zb-svc.feat .zb-hex{background:var(--y)}
#zhBook .zb-svc.feat .zb-meta span{background:rgba(255,255,255,.14);color:#fff}
#zhBook .zb-svc.feat .zb-meta .o{background:var(--y);color:var(--ink)}
#zhBook .zb-svc.feat .chev{background:var(--y);color:var(--ink)}
#zhBook .zb-badge{top:-9px;right:14px;box-shadow:0 4px 10px rgba(242,178,0,.35)}
#zhBook .zb-row{border-radius:16px;padding:12px 12px 12px 14px;position:relative;transition:border-color .2s,background .2s,box-shadow .2s}
#zhBook .zb-row:hover{border-color:#B9DCD9}
#zhBook .zb-row.on{border-color:var(--t);background:linear-gradient(90deg,#E6F4F3,#fff 70%);box-shadow:inset 4px 0 0 var(--t)}
#zhBook .zb-row .pr{display:flex;align-items:center;flex-wrap:wrap;gap:0 2px;font-size:16px;margin-top:4px}
#zhBook .zb-add{background:var(--y);border-color:var(--y);color:var(--ink);border-radius:999px;padding:8px 18px;box-shadow:0 6px 14px -6px rgba(242,178,0,.7)}
#zhBook .zb-add:hover{filter:brightness(.96)}
#zhBook .zb-qty{border-radius:999px;border-color:var(--t)}
#zhBook .zb-qty button{width:34px}
#zhBook .zb-tabs{background:#F1F5F5;border-radius:999px;padding:4px;display:flex;gap:2px;flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none;max-width:100%}
#zhBook .zb-tabs::-webkit-scrollbar{display:none}
#zhBook .zb-tabs button{white-space:nowrap;flex:1 0 auto}
#zhBook .zb-tabs button{border:0;background:transparent;padding:8px 16px}
#zhBook .zb-tabs button.on{background:#fff;color:var(--td);box-shadow:0 2px 8px rgba(7,72,72,.15)}
#zhBook .zb-dur button{border-radius:16px;padding:12px 6px}
#zhBook .zb-dur button.on{background:var(--td);border-color:var(--td);color:#fff;box-shadow:none}
#zhBook .zb-dur button.on span{color:var(--y)}
#zhBook .zb-dur button.on s{color:#9EC9C6}
#zhBook .zb-opt{border-radius:16px}
#zhBook .zb-sum{background:#053E40;color:#E6F4F3;border:0;border-radius:18px;padding:14px 16px}
#zhBook .zb-sum b{color:#fff}
#zhBook .zb-sum s{color:#7FB1AE}
#zhBook .zb-sum .tot{color:#fff;border-top-color:rgba(255,255,255,.18)}
#zhBook .zb-sum .save{color:var(--y)}
#zhBook .zb-cta{transition:transform .15s,box-shadow .15s}
#zhBook .zb-cta:not(:disabled):hover{transform:translateY(-1px);box-shadow:0 12px 24px rgba(242,178,0,.45)}
@media (max-width:440px){#zhBook .zb-svc .chev{display:none}#zhBook .zb-hex{width:42px;height:48px;font-size:21px}#zhBook .zb-svc{gap:12px}}
@media (max-width:420px){#zhBook .zb-grid.three{grid-template-columns:repeat(2,minmax(0,1fr))}}
`;

const S = {
  cat: null, svc: null, step: "svc", hist: [],
  // phone
  phone: null, brand: null, model: null, otherModel: "", issue: null, sub: null, answer: null, sku: null, q: "",
  // other services
  variant: "", group: "", sel: {}, item: null, dur: null, other: false,
  // details
  name: "", mobile: "", area: "", addr: "", pin: "", geo: null, remarks: "", err: "", busy: false, done: null,
};
const picker = document.createElement("zh-slot-picker");
picker.id = "zbSlot";

// ---------------- phone catalog ----------------
let phoneP = null;
function loadPhone() {
  return (phoneP ||= Promise.all([
    fetch("/zipphive-catalog.json?v=21").then((r) => r.json()),
    backend().then((be) => (be && be.getPriceOverrides ? be.getPriceOverrides() : {})).catch(() => ({})),
  ]).then(([c, ov]) => {
    const hidden = new Set();
    for (const [code, o] of Object.entries(ov || {})) {
      const k = c.skus[code];
      if (!k) continue;
      if (o.hidden) hidden.add(code);
      if (o.price !== undefined) k.price = o.price;
      if (o.mrp !== undefined) k.mrp = o.mrp;
      if (o.warrantyMonths !== undefined) k.warrantyMonths = o.warrantyMonths;
    }
    if (hidden.size) for (const m of c.models) for (const [id, r] of Object.entries(m.repairs)) {
      if ("skus" in r) { r.skus = r.skus.filter((x) => !hidden.has(x)); if (!r.skus.length) delete m.repairs[id]; }
      else { r.answers = r.answers.map((a) => ({ ...a, skus: a.skus.filter((x) => !hidden.has(x)) })).filter((a) => a.skus.length); if (!r.answers.length) delete m.repairs[id]; }
    }
    return c;
  }).catch((e) => { phoneP = null; throw e; }));
}
const P = () => S.phone;
const modelIssues = (m) => {
  const ids = Object.keys(m.repairs).map(Number);
  return P().issues.filter((i) => P().subIssues.some((s) => s.issueId === i.id && ids.includes(s.id))).sort((a, b) => a.order - b.order);
};
const subsOf = (m, issueId) => P().subIssues.filter((s) => s.issueId === issueId && m.repairs[String(s.id)]);
const DIAG = "S100001";

// ---------------- flow ----------------
const svc = () => S.svc && svcById(S.cat, S.svc);
function stepsFor(s) {
  if (!s) return ["svc"];
  if (s.mode === "phone") return ["svc", "brand", "model", "issue", "price", "slot", "details"];
  if (s.mode === "duration") return ["svc", "item", "price", "slot", "details"];
  return ["svc", ...(s.variants ? ["variant"] : []), "price", "slot", "details"];
}
function go(step) { S.hist.push(S.step); S.step = step; S.err = ""; track("step_" + step); if (step === "slot") track("step_slot_" + S.svc); render(true); }
function back() { S.step = S.hist.pop() || "svc"; S.err = ""; render(true); }

function cart() {
  const s = svc();
  if (!s) return { lines: [], total: 0, priced: true };
  const lines = [];
  let priced = true;
  if (s.mode === "phone") {
    const k = S.sku && P().skus[S.sku];
    if (k) { lines.push([k.label, k.price, k.mrp]); if (k.price == null) priced = false; }
    else if (S.other) lines.push(["Home diagnosis", P()?.skus[DIAG]?.price ?? 99]);
  } else if (s.mode === "duration") {
    if (S.item && S.dur) lines.push([`${S.item.name} · ${S.dur} min`, itemPrice(s, S.item, S.dur), itemMrp(s, S.item, S.dur)]);
    if (S.other) lines.push(["Visit for custom request", s.otherPrice || 0]);
  } else {
    for (const it of s.items) {
      const q = S.sel[it.id];
      if (q) lines.push([`${it.name}${q > 1 ? " × " + q : ""}`, itemPrice(s, it, S.variant) * q, itemMrp(s, it, S.variant) * q]);
    }
    if (S.other) lines.push(["Other issue – inspection visit", s.otherPrice || 0]);
  }
  const total = lines.reduce((a, l) => a + (Number(l[1]) || 0), 0);
  const mrpTotal = lines.reduce((a, l) => a + (Number(l[2]) > Number(l[1]) ? Number(l[2]) : Number(l[1]) || 0), 0);
  return { lines, total, priced, save: priced ? Math.max(0, mrpTotal - total) : 0 };
}
const summary = (showCta, ctaLabel, disabled) => {
  const c = cart();
  if (!c.lines.length && !showCta) return "";
  return `${c.lines.length ? `<div class="zb-sum">${c.lines.map(([l, p, m]) => `<div class="ln"><span>${esc(l)}</span><b>${p == null ? "On inspection" : rs(p)}${m > p && p > 0 ? `<s>${rs(m)}</s>` : ""}</b></div>`).join("")}
    <div class="ln tot"><span>Total (pay after service)</span><span>${c.priced ? rs(c.total) : "After inspection"}</span></div>
    ${c.save > 0 ? `<div class="ln save"><span>🎉 You save</span><span>${rs(c.save)}</span></div>` : ""}</div>` : ""}
    ${showCta ? `<button class="zb-cta" data-a="next" ${disabled ? "disabled" : ""}>${ctaLabel}</button>` : ""}`;
};

// ---------------- views ----------------
function vSvc() {
  return `<h3>What do you need?</h3><p class="zb-sub">Pick a service – you'll see the price before you book.</p>
    <div class="zb-list">${S.cat.services.map((s) => {
      const st = s.mode === "phone" ? null : svcStats(s), tone = SVC_TONE[s.id] || {};
      const meta = s.mode === "phone" ? `<span>Exact price for your model</span>` : st.min ? `<span>from ${rs(st.min)}</span>${st.off ? `<span class="o">up to ${st.off}% off</span>` : ""}` : "";
      return `<button class="zb-opt zb-svc ${s.id === "cleaning" ? "feat" : ""}" data-a="svc" data-v="${s.id}">
      ${s.badge ? `<span class="zb-badge">${esc(s.badge)}</span>` : ""}<span class="zb-hex" style="--tn:${tone.tint || "#E6F4F3"}">${SVC_COVER[s.id] ? `<img src="${SVC_COVER[s.id]}" alt="" onerror="this.replaceWith('${s.icon}')">` : s.icon}</span>
      <span class="tx"><b>${esc(s.name)}</b><small>${esc(s.tagline || "")}</small>${meta ? `<span class="zb-meta">${meta}</span>` : ""}</span><span class="chev" aria-hidden="true">›</span></button>`;
    }).join("")}</div>`;
}
function vBrand() {
  if (!P()) return `<div class="zb-load">Loading phone models…</div>`;
  return `<h3>Which phone brand?</h3><p class="zb-sub">Mobile repair at your doorstep in about 60 minutes.</p>
    <div class="zb-grid three">${P().brands.map((b) => `<button class="zb-opt" data-a="brand" data-v="${b.id}"><b>${esc(b.name)}</b>${b.name === "Xiaomi" ? "<small>Redmi · POCO</small>" : ""}</button>`).join("")}
    <button class="zb-opt zb-other" data-a="brand" data-v="other"><b>Other brand</b><small>iQOO, Infinix, Tecno, Lava, Honor…</small></button></div>`;
}
function modelList() {
  const q = S.q.trim().toLowerCase();
  const list = P().models.filter((m) => m.brandId === S.brand && (!q || m.name.toLowerCase().includes(q)));
  let html = "", ser = "";
  for (const m of list) {
    if (!q && m.series !== ser) { ser = m.series; html += `<div class="zb-ser">${esc(ser || "")}</div>`; }
    html += `<button class="zb-opt" style="width:100%;margin-bottom:6px" data-a="model" data-v="${m.id}"><b>${esc(m.name)}</b></button>`;
  }
  return html || `<p class="zb-sub">No model matches “${esc(S.q)}”.</p>`;
}
function vModel() {
  const brand = S.brand === "other" ? null : P().brands.find((b) => b.id === S.brand);
  if (!brand) return vOtherModel(null);
  return `<h3>Which ${esc(brand.name)} model?</h3>
    <input class="zb-search" id="zbQ" placeholder="Search model, e.g. ${brand.name === "Apple" ? "iPhone 13" : "Galaxy S23"}" value="${esc(S.q)}" autocomplete="off">
    <div class="zb-models" id="zbModels">${modelList()}</div>
    <button class="zb-opt zb-other" style="width:100%;margin-top:8px" data-a="othermodel"><b>My model isn't listed</b><small>Type your model and problem – we'll quote after a quick check</small></button>`;
}
function vOtherModel(brand) {
  return `<h3>Tell us your phone</h3><p class="zb-sub">Not in our list? No problem – write the model and what's wrong.</p>
    <label for="zbOM">Brand & model *</label><input id="zbOM" data-f="otherModel" value="${esc(S.otherModel)}" placeholder="${brand ? esc(brand.name) + " …" : "e.g. Vivo V29, Redmi Note 13"}">
    <label for="zbOR">What's the problem? *</label><textarea id="zbOR" data-f="remarks" rows="3" placeholder="e.g. Screen cracked, touch works / battery drains fast">${esc(S.remarks)}</textarea>
    <p class="zb-sub" style="margin-top:8px">A technician checks the phone at your door (Home diagnosis ${rs(P().skus[DIAG]?.price ?? 99)}) and tells you the exact price before repairing.</p>
    ${S.err ? `<div class="zb-err">${esc(S.err)}</div>` : ""}
    <button class="zb-cta" data-a="otherdone">Continue</button>`;
}
function vIssue() {
  const m = S.model;
  return `<h3>What's wrong with your ${esc(m.name)}?</h3><p class="zb-sub">Pick the problem.</p>
    <div class="zb-grid three">${modelIssues(m).map((i) => `<button class="zb-opt" data-a="issue" data-v="${i.id}"><span class="zb-art"><img src="${issueImg(i.id)}" alt="" loading="lazy" onerror="this.replaceWith('${ISSUE_ICON[i.id] || "🛠️"}')"></span><b>${esc(i.name)}</b></button>`).join("")}
    <button class="zb-opt zb-other" data-a="issue" data-v="other"><span class="zb-art"><img src="/zh-img/svc/ph-other.svg" alt="" loading="lazy"></span><b>Other / not sure</b></button></div>`;
}
function vSub() {
  const m = S.model;
  const subs = subsOf(m, S.issue.id);
  return `<h3>${esc(S.issue.name)}</h3><p class="zb-sub">Which one describes it best?</p>
    <div class="zb-list">${subs.map((s) => `<button class="zb-opt" data-a="sub" data-v="${s.id}"><b>${esc(s.name)}</b></button>`).join("")}</div>`;
}
function vAnswer() {
  const r = S.model.repairs[String(S.sub.id)];
  return `<h3>${esc(r.question)}</h3><p class="zb-sub">${esc(S.sub.name)} · ${esc(S.model.name)}</p>
    <div class="zb-list">${r.answers.map((a, i) => `<button class="zb-opt" data-a="answer" data-v="${i}"><b>${esc(a.answer)}</b></button>`).join("")}</div>`;
}
function phoneSkus() {
  const r = S.model.repairs[String(S.sub.id)];
  return "skus" in r ? r.skus : r.answers[S.answer].skus;
}
function vPricePhone() {
  if (S.other) {
    return `<h3>Your price</h3><p class="zb-sub">${esc(S.otherModel || S.model?.name || "")}${S.remarks ? " · " + esc(cut(S.remarks, 80)) : ""}</p>
      ${S.model ? `<label for="zbOR">Describe the problem *</label><textarea id="zbOR" data-f="remarks" rows="3" placeholder="What's happening with the phone?">${esc(S.remarks)}</textarea>` : ""}
      ${S.err ? `<div class="zb-err">${esc(S.err)}</div>` : ""}
      ${summary(true, "Choose time slot →")}
      <p class="zb-note">Exact repair price is shared after the check – you approve before any work starts.</p>`;
  }
  const skus = phoneSkus();
  const opts = skus.map((code) => {
    const k = P().skus[code];
    if (!k) return "";
    return `<button class="zb-opt ${S.sku === code ? "on" : ""}" style="width:100%" data-a="sku" data-v="${code}"><b>${esc(k.label)}</b>
      <small>${esc(k.type || "")}${k.warrantyMonths ? ` · 🛡️ ${k.warrantyMonths}-month warranty` : ""}</small>
      <span class="pr">${k.price == null ? "Price on inspection" : tag(k.price, k.mrp)}</span></button>`;
  }).join("");
  return `<h3>Choose your repair</h3><p class="zb-sub">${esc(S.model.name)} · ${esc(S.issue.name)} · ${esc(S.sub.name)}${S.answer != null ? " · " + esc(S.model.repairs[String(S.sub.id)].answers[S.answer].answer) : ""}</p>
    <div class="zb-list">${opts}</div>
    <label for="zbOR">Anything else we should know? (optional)</label><textarea id="zbOR" data-f="remarks" rows="2" placeholder="e.g. phone also heats up">${esc(S.remarks)}</textarea>
    ${summary(true, "Choose time slot →", !S.sku)}`;
}
function vItem() {
  const s = svc();
  const card = (i) => {
    const f = itemFrom(s, i), off = f && f.mrp > f.price ? offPct(f.mrp, f.price) : 0;
    return `<button class="zb-pic ${i.id === "combo" ? "wide" : ""}" data-a="item" data-v="${i.id}" aria-label="${esc(i.name)}">
      <span class="ph${isStock(itemImg(i)) ? " st" : ""}" data-e="${CLEAN_EMOJI[i.id] || "✨"}"><img src="${esc(itemImg(i, i.id === "combo" ? 900 : 480))}" alt="" loading="lazy" onerror="this.remove()">${off ? `<em>${off}% OFF</em>` : ""}${i.id === "combo" ? `<i>★ Most booked</i>` : ""}</span>
      <b>${esc(i.name)}</b><span class="fr">${f ? `from <strong>${rs(f.price)}</strong>${f.mrp > f.price ? `<s>${rs(f.mrp)}</s>` : ""}` : "–"}</span></button>`;
  };
  const items = s.items.filter((i) => i.active !== false).sort((a, b) => (b.id === "combo") - (a.id === "combo"));
  return `<h3>${esc(s.name)}</h3><p class="zb-sub">${esc(s.tagline || "")}</p>
    <div class="zb-pics">${items.map(card).join("")}
    <button class="zb-pic wide" data-a="item" data-v="other"><span class="ph st" data-e="🏠"><img src="${esc(itemImg({ id: "other" }, 480))}" alt="" loading="lazy" onerror="this.remove()"></span><b>Something else</b><span class="fr">Full-home, move-in, office…</span></button></div>
    <p class="zb-note">Pick what to clean → choose 30, 45 or 60 min → pick a slot. Cleaners bring all equipment.</p>`;
}
function vPriceDuration() {
  const s = svc();
  if (S.other) {
    return `<h3>Tell us what to clean</h3>
      <label for="zbOR">Describe the job *</label><textarea id="zbOR" data-f="remarks" rows="3" placeholder="e.g. 2BHK full deep cleaning before Diwali">${esc(S.remarks)}</textarea>
      <p class="zb-sub" style="margin-top:8px">Our supervisor visits, checks the area and shares the final price. Visit charge ${rs(s.otherPrice)} – adjusted in the bill if you book.</p>
      ${S.err ? `<div class="zb-err">${esc(S.err)}</div>` : ""}${summary(true, "Choose time slot →")}`;
  }
  const it = S.item;
  return `<div class="zb-banner" data-e="${CLEAN_EMOJI[it.id] || "✨"}"><img src="${esc(itemImg(it, 900))}" style="object-position:center 25%" alt="" onerror="this.remove()"><div><h3>${esc(it.name)}</h3><p>${esc(it.desc || "")}</p></div></div>
    <label>How long should the cleaner spend?</label>
    <div class="zb-dur">${s.durations.map((d) => `<button class="${S.dur === d ? "on" : ""}" data-a="dur" data-v="${d}"><b>${d} min</b><span>${rs(itemPrice(s, it, d))}</span>${itemMrp(s, it, d) > itemPrice(s, it, d) ? `<s>${rs(itemMrp(s, it, d))}</s><em class="off">${offPct(itemMrp(s, it, d), itemPrice(s, it, d))}% OFF</em>` : ""}</button>`).join("")}</div>
    <label for="zbOR">Notes for the cleaner (optional)</label><textarea id="zbOR" data-f="remarks" rows="2" placeholder="e.g. 2 bathrooms, hard water stains">${esc(S.remarks)}</textarea>
    ${summary(true, "Choose time slot →", !S.dur)}`;
}
function vVariant() {
  const s = svc();
  return `<h3>${esc(s.variantLabel || "Type")}</h3><p class="zb-sub">${esc(s.name)} – prices depend on the AC type.</p>
    <div class="zb-grid">${s.variants.map((v) => `<button class="zb-opt" data-a="variant" data-v="${esc(v)}"><span class="zb-art"><img src="${variantImg(v)}" alt="" loading="lazy"></span><b>${esc(v)}</b></button>`).join("")}</div>`;
}
function vPriceItems() {
  const s = svc();
  const groups = s.groups && s.groups.length ? s.groups : [null];
  const g = S.group || groups[0];
  const items = s.items.filter((i) => i.active !== false && (!g || i.group === g));
  const row = (it) => {
    const q = S.sel[it.id] || 0, p = itemPrice(s, it, S.variant), m = itemMrp(s, it, S.variant);
    return `<div class="zb-row ${q ? "on" : ""}"><span class="zb-th"><img src="${esc(svcItemImg(s, it))}" alt="" loading="lazy" onerror="this.remove()"></span><div class="tx"><b>${esc(it.name)}${it.hot ? ` <span class="zb-badge" style="position:static;margin-left:4px">POPULAR</span>` : ""}</b><small>${esc(it.desc || "")}</small>
      <span class="pr">${tag(p, m)}${s.qtyLabel === "ACs" ? " <small style=\"display:inline;font-weight:600\">/ AC</small>" : ""}</span></div>
      ${q ? `<span class="zb-qty"><button data-a="qty" data-v="${it.id}" data-d="-1" aria-label="Less">−</button><span>${q}</span><button data-a="qty" data-v="${it.id}" data-d="1" aria-label="More">+</button></span>`
        : `<button class="zb-add" data-a="qty" data-v="${it.id}" data-d="${it.minQty || 1}">Add</button>`}</div>`;
  };
  const any = Object.values(S.sel).some(Boolean) || S.other;
  return `<h3>${esc(s.name)}</h3><p class="zb-sub">${S.variant ? esc(S.variant) + " · " : ""}${s.single ? "Choose a plan and the number of ACs." : "Add everything you need – each has its own price."}</p>
    ${groups[0] ? `<div class="zb-tabs">${groups.map((x) => `<button class="${x === g ? "on" : ""}" data-a="group" data-v="${esc(x)}">${esc(x)}</button>`).join("")}</div>` : ""}
    <div class="zb-list">${items.map(row).join("")}
    ${s.otherPrice != null && !s.single ? `<div class="zb-row zb-other ${S.other ? "on" : ""}"><span class="zb-th"><img src="/zh-img/svc/${s.id === "ac" ? "ac-check" : "electrician"}.svg" alt="" loading="lazy" onerror="this.remove()"></span><div class="tx"><b>Other issue – not listed</b><small>Describe it below; technician inspects and quotes (visit ${rs(s.otherPrice)})</small></div>
      <button class="zb-add" data-a="other">${S.other ? "Remove" : "Add"}</button></div>` : ""}</div>
    ${S.other ? `<label for="zbOR">Describe the issue *</label><textarea id="zbOR" data-f="remarks" rows="2" placeholder="e.g. geyser not heating, MCB trips again and again">${esc(S.remarks)}</textarea>`
      : `<label for="zbOR">Notes (optional)</label><textarea id="zbOR" data-f="remarks" rows="2" placeholder="Brand, model, floor, anything useful">${esc(S.remarks)}</textarea>`}
    ${S.err ? `<div class="zb-err">${esc(S.err)}</div>` : ""}
    ${summary(true, "Choose time slot →", !any)}`;
}
function vSlot() {
  return `<h3>Pick a date & time</h3><p class="zb-sub">Only open slots are shown.</p><div id="zbSlotHost"></div>
    ${summary(true, "Continue →")}`;
}
// where the customer is: ok / outside / unknown
function locState() {
  if (S.pin.length === 6) return pinOk(S.pin) ? "ok" : "out";
  if (S.geo && S.geo.lat != null) return S.geo.ok ? "ok" : "out";
  return "unknown";
}
function locHtml() {
  const st = locState();
  if (S.geo?.busy) return `<p class="zb-sub" style="margin:6px 0 0">Finding your location…</p>`;
  if (st === "ok") return `<p style="margin:6px 0 0;color:#1E8E3E;font-weight:700;font-size:13.5px">✅ Great – we serve your area${S.geo && S.pin.length !== 6 && S.geo.zone ? ` (${esc(S.geo.zone.name)} zone)` : ""}.</p>`;
  if (st === "out") return `<div style="margin:8px 0 0;background:#FDECEC;border-radius:12px;padding:10px 12px;color:#9C0006;font-size:13.5px">
    <b>Sorry, we don't serve this area yet.</b><br>${S.pin.length === 6 ? `Pincode ${esc(S.pin)} is outside our service area.` : S.geo.km != null ? `Your location is about ${S.geo.km.toFixed(0)} km from our nearest service zone.` : "Please enter your pincode instead."}
    We're expanding soon – <a href="${NOTIFY}" target="_blank" rel="noopener" style="color:#9C0006;font-weight:700">get notified on WhatsApp</a>.</div>`;
  if (S.geo?.error) return `<p class="zb-sub" style="margin:6px 0 0">${esc(S.geo.error)} – please enter your pincode.</p>`;
  return `<p class="zb-sub" style="margin:6px 0 0">Enter your pincode to check we serve your area${AREA().city ? ` in ${esc(AREA().city)}` : ""}.</p>`;
}
function vDetails() {
  return `<h3>Your details</h3><p class="zb-sub">📅 ${esc(picker.value || "")}</p>
    <label for="zbN">Your name *</label><input id="zbN" data-f="name" value="${esc(S.name)}" autocomplete="name" placeholder="e.g. Rahul Kumar">
    <label for="zbM">Mobile number *</label><input id="zbM" data-f="mobile" value="${esc(S.mobile)}" inputmode="numeric" maxlength="10" autocomplete="tel-national" placeholder="10-digit number">
    <label for="zbA">Area / locality *</label><input id="zbA" data-f="area" value="${esc(S.area)}" autocomplete="address-level3" placeholder="Your locality / colony">
    <label for="zbP">Pincode *</label>
    <div style="display:flex;gap:8px"><input id="zbP" data-f="pin" value="${esc(S.pin)}" inputmode="numeric" maxlength="6" autocomplete="postal-code" placeholder="e.g. 800001" style="flex:1">
      <button class="zb-add" type="button" data-a="geo" style="white-space:nowrap">📍 Use my location</button></div>
    <div id="zbLoc">${locHtml()}</div>
    <label for="zbH">House no. / landmark</label><input id="zbH" data-f="addr" value="${esc(S.addr)}" placeholder="Flat, building, nearby landmark">
    ${S.err ? `<div class="zb-err">${esc(S.err)}</div>` : ""}
    ${summary(false)}
    <button class="zb-cta" data-a="confirm" ${S.busy || locState() === "out" ? "disabled" : ""}>${S.busy ? "Booking…" : "Confirm booking"}</button>
    <p class="zb-note">No advance payment. Pay after the work – UPI, card or cash.</p>`;
}
function vDone() {
  const d = S.done;
  return `<div class="zb-done"><div class="tick">✓</div><h3>Booking received!</h3>
    <p class="zb-sub">Thanks ${esc(S.name.split(" ")[0])} – we'll confirm your technician on WhatsApp shortly.</p>
    <div class="bid">Booking ID <b>${esc(d.code)}</b><br><small>${esc(picker.value || "")}</small></div>
    <a class="zb-cta" style="display:block;text-decoration:none;text-align:center" href="${d.url}">📍 Track your booking</a>
    <button class="zb-back" style="width:auto;padding:0 16px;margin-top:12px;height:38px" data-a="restart">Book another service</button></div>`;
}

function view() {
  if (!S.cat) return `<div class="zb-load">Loading services…</div>`;
  if (S.step === "done") return vDone();
  const s = svc();
  switch (S.step) {
    case "svc": return vSvc();
    case "brand": return vBrand();
    case "model": return S.modelOther ? vOtherModel(P().brands.find((b) => b.id === S.brand)) : vModel();
    case "issue": return vIssue();
    case "sub": return vSub();
    case "answer": return vAnswer();
    case "item": return vItem();
    case "variant": return vVariant();
    case "price": return s.mode === "phone" ? vPricePhone() : s.mode === "duration" ? vPriceDuration() : vPriceItems();
    case "slot": return vSlot();
    case "details": return vDetails();
  }
  return "";
}
function render(scroll) {
  const steps = stepsFor(svc());
  const map = { sub: "issue", answer: "issue" };
  const idx = Math.max(0, steps.indexOf(map[S.step] || S.step));
  const top = S.step === "svc" || S.step === "done" ? "" :
    `<div class="zb-top"><button class="zb-back" data-a="back" aria-label="Back">‹</button><div class="zb-prog">${steps.slice(1).map((_, i) => `<i class="${i < idx ? "on" : ""}"></i>`).join("")}</div></div>`;
  root.innerHTML = top + view();
  const host = root.querySelector("#zbSlotHost");
  if (host) {
    const s = svc();
    picker.setAttribute("service", s.slotService || s.name);
    if (s.mode === "duration" && S.dur) picker.setAttribute("dur", S.dur); else picker.removeAttribute("dur");
    host.appendChild(picker);
  }
  if (scroll) {
    const r = root.getBoundingClientRect();
    if (r.top < 0 || r.top > window.innerHeight * 0.6) root.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ---------------- events ----------------
root.addEventListener("input", (e) => {
  const t = e.target;
  if (t.id === "zbQ") { S.q = t.value; const box = root.querySelector("#zbModels"); if (box) box.innerHTML = modelList(); return; }
  if (t.dataset.f) {
    let v = t.value;
    if (t.dataset.f === "mobile") { v = v.replace(/\D/g, "").slice(0, 10); t.value = v; }
    if (t.dataset.f === "pin") { v = v.replace(/\D/g, "").slice(0, 6); t.value = v; }
    S[t.dataset.f] = v;
    if (t.dataset.f === "pin") { const box = root.querySelector("#zbLoc"); if (box) box.innerHTML = locHtml(); syncConfirm(); }
    if (S.err) { S.err = ""; root.querySelector(".zb-err")?.remove(); }
  }
});
root.addEventListener("click", async (e) => {
  const b = e.target.closest("[data-a]");
  if (!b) return;
  e.preventDefault();
  const a = b.dataset.a, v = b.dataset.v, s = svc();
  if (a === "back") return back();
  if (a === "restart") { Object.assign(S, { svc: null, step: "svc", hist: [], sku: null, sel: {}, item: null, dur: null, other: false, remarks: "", done: null, err: "" }); return render(true); }
  if (a === "svc") return startService(v);
  // phone
  if (a === "brand") {
    S.brand = v === "other" ? "other" : Number(v); S.q = ""; S.model = null; S.other = false; S.modelOther = v === "other";
    return go("model");
  }
  if (a === "othermodel") { S.modelOther = true; return render(); }
  if (a === "otherdone") {
    if (S.otherModel.trim().length < 2) return (S.err = "Please write your phone brand and model.", render());
    if (S.remarks.trim().length < 3) return (S.err = "Please describe the problem.", render());
    S.other = true; S.model = null; S.sku = null; S.issue = null;
    return go("price");
  }
  if (a === "model") { S.model = P().models.find((m) => m.id === Number(v)); S.modelOther = false; S.other = false; return go("issue"); }
  if (a === "issue") {
    if (v === "other") { S.other = true; S.issue = null; S.sku = null; return go("price"); }
    S.other = false; S.issue = P().issues.find((i) => i.id === Number(v)); S.answer = null; S.sku = null;
    const subs = subsOf(S.model, S.issue.id);
    if (subs.length === 1) { S.sub = subs[0]; return afterSub(); }
    return go("sub");
  }
  if (a === "sub") { S.sub = P().subIssues.find((x) => x.id === Number(v)); S.answer = null; S.sku = null; return afterSub(); }
  if (a === "answer") { S.answer = Number(v); S.sku = null; const sk = phoneSkus(); if (sk.length === 1) S.sku = sk[0]; return go("price"); }
  if (a === "sku") { S.sku = v; return render(); }
  // cleaning
  if (a === "item") {
    if (v === "other") { S.other = true; S.item = null; S.dur = null; return go("price"); }
    S.other = false; S.item = s.items.find((i) => i.id === v); S.dur = S.dur && s.durations.includes(S.dur) ? S.dur : null;
    return go("price");
  }
  if (a === "dur") { S.dur = Number(v); return render(); }
  // items
  if (a === "variant") { S.variant = v; return go("price"); }
  if (a === "group") { S.group = v; return render(); }
  if (a === "qty") {
    const it = s.items.find((i) => i.id === v), d = Number(b.dataset.d);
    let q = (S.sel[v] || 0) + d;
    if (q > 0 && q < (it.minQty || 1)) q = d > 0 ? it.minQty : 0;
    if (s.single && q > 0) for (const k of Object.keys(S.sel)) if (k !== v) delete S.sel[k];
    S.sel[v] = Math.max(0, Math.min(q, 20)); if (!S.sel[v]) delete S.sel[v];
    return render();
  }
  if (a === "other") { S.other = !S.other; return render(); }
  if (a === "next") return next();
  if (a === "geo") return useLocation();
  if (a === "confirm") return confirm();
});
function afterSub() {
  const r = S.model.repairs[String(S.sub.id)];
  if (r && r.question) return go("answer");
  const sk = phoneSkus(); S.sku = sk.length === 1 ? sk[0] : null;
  return go("price");
}
async function startService(id, quiet) {
  if (!quiet) { track("step_svc"); track("svc_" + id); }
  S.svc = id; S.hist = ["svc"]; S.err = ""; S.sel = {}; S.other = false; S.item = null; S.dur = null; S.sku = null; S.group = ""; S.variant = ""; S.remarks = "";
  const s = svc();
  if (s.mode === "phone") {
    S.step = "brand"; render(true);
    if (!S.phone) {
      try { S.phone = await loadPhone(); } catch { S.err = "Could not load models"; root.innerHTML = `<div class="zb-load">Couldn't load phone models. <a href="https://wa.me/919220400950">WhatsApp us</a> or call +91 92204 00950.</div>`; return; }
      if (S.step === "brand") render();
    }
    return;
  }
  S.step = s.mode === "duration" ? "item" : s.variants ? "variant" : "price";
  if (!quiet && S.step === "price") track("step_price");
  render(!quiet);
}
function next() {
  const s = svc();
  if (S.step === "price") {
    if (S.other && S.remarks.trim().length < 3) { S.err = "Please describe the issue so the technician comes prepared."; return render(); }
    if (s.mode === "items") {
      for (const it of s.items) if (S.sel[it.id] && it.minQty && S.sel[it.id] < it.minQty) { S.err = `${it.name} needs at least ${it.minQty} ${s.qtyLabel || ""}.`; return render(); }
    }
    return go("slot");
  }
  if (S.step === "slot") return go("details");
}
function syncConfirm() {
  const btn = root.querySelector("[data-a=confirm]");
  if (btn && !S.busy) btn.disabled = locState() === "out";
}
function useLocation() {
  if (!navigator.geolocation) { S.geo = { error: "Location isn't available on this device" }; return render(); }
  S.geo = { busy: true }; const box = root.querySelector("#zbLoc"); if (box) box.innerHTML = locHtml();
  navigator.geolocation.getCurrentPosition(
    (p) => {
      const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
      S.geo = { ...pos, ...checkGeo(AREA(), pos) };
      render();
    },
    () => { S.geo = { error: "Couldn't get your location" }; render(); },
    { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
  );
}
async function confirm() {
  const s = svc();
  S.name = S.name.trim(); S.area = S.area.trim();
  if (S.name.length < 2) { S.err = "Please enter your name."; return render(); }
  if (!/^[6-9]\d{9}$/.test(S.mobile)) { S.err = "Please enter a valid 10-digit mobile number."; return render(); }
  if (S.area.length < 2) { S.err = "Please enter your area."; return render(); }
  const ls = locState();
  if (ls === "out") { if (S.pin.length === 6) track("pinout_" + S.pin); S.err = "Sorry, we don't serve this area yet – please check the pincode."; return render(); }
  if (ls !== "ok") { S.err = `Please enter your 6-digit pincode (or tap “Use my location”) so we can check we serve your area.`; return render(); }
  S.busy = true; S.err = ""; render();
  const c = cart();
  const data = { name: cut(S.name, 60), mobile: S.mobile, area: cut(S.area + (S.pin.length === 6 ? ", " + S.pin : ""), 60), time: cut(picker.value || "Will call to fix a time", 40) };
  if (picker.slotKey) data.slot = picker.slotKey;
  const notes = [S.addr && "Address: " + S.addr, S.geo?.lat && `Map: https://maps.google.com/?q=${S.geo.lat.toFixed(5)},${S.geo.lng.toFixed(5)}`,
    S.remarks && (S.other ? "" : "Notes: ") + S.remarks].filter(Boolean).join(" | ");
  if (s.mode === "phone") {
    data.kind = "phone"; data.service = "Mobile Repair";
    const brand = S.brand === "other" ? "" : P().brands.find((x) => x.id === S.brand)?.name || "";
    data.device = cut(S.model ? `${brand} ${S.model.name}` : S.otherModel || "Phone", 80);
    if (S.other) { data.item = "Home diagnosis – quote after check"; data.problem = cut(S.remarks || "Not sure", 200); data.price = P().skus[DIAG]?.price ?? 99; }
    else {
      const k = P().skus[S.sku];
      data.item = cut(k.label, 120);
      data.problem = cut([S.issue.name, S.sub.name, S.answer != null ? S.model.repairs[String(S.sub.id)].answers[S.answer].answer : ""].filter(Boolean).join(" – "), 200);
      if (k.price != null) data.price = k.price;
    }
  } else {
    data.kind = "service"; data.service = cut(s.name, 80);
    if (S.variant) data.device = cut(S.variant, 80);
    data.item = cut(c.lines.map((l) => l[0]).join(", "), 120);
    data.problem = cut(S.other ? S.remarks : c.lines.map((l) => l[0]).join(", "), 200);
    data.price = c.total;
  }
  if (notes) data.note = cut(notes, 300);
  try {
    if (data.slot && window.ZHSlots && !(await window.ZHSlots.stillFree(data.slot))) {
      S.busy = false; S.err = "Sorry, that time slot just got booked – please pick another one."; await picker.refresh?.(); S.hist.pop(); S.step = "slot"; return render(true);
    }
    const be = await backend();
    let job;
    try { job = await be.createBooking(data); }
    catch (e1) { if (!data.slot) throw e1; const { slot, ...rest } = data; job = await be.createBooking(rest); }
    if (data.slot) Promise.resolve(window.ZHSlots?.reserve(data.slot)).then(() => picker.refresh?.());
    S.done = { code: job.code, url: trackUrl(job.id) }; S.busy = false; S.step = "done"; track("booked"); track("booked_" + S.svc); render(true);
  } catch (err) {
    console.warn(err);
    S.busy = false;
    const msg = `Hi ZippHive, I'd like to book.\n${data.service}${data.device ? " – " + data.device : ""}\n${data.item || ""}\n${data.problem || ""}\nPrice: ${rs(data.price)}\nSlot: ${data.time}\nName: ${data.name}\nMobile: ${data.mobile}\nArea: ${data.area}${data.note ? "\n" + data.note : ""}`;
    S.err = "Couldn't save the booking online – opening WhatsApp so you can send it to us.";
    render();
    window.open(`https://wa.me/919220400950?text=${encodeURIComponent(msg)}`, "_blank", "noopener");
  }
}

// Open the flow at a service from anywhere on the page: <a data-book="cleaning" href="#book">, data-book-item for a preselected item
document.addEventListener("click", (e) => {
  const a = e.target.closest("[data-book]");
  if (!a || !S.cat) return;
  const id = a.dataset.book;
  if (!svcById(S.cat, id)) return;
  startService(id).then(() => {
    const s = svc();
    if (a.dataset.bookItem && s.mode === "duration") {
      const it = s.items.find((i) => i.id === a.dataset.bookItem && i.active !== false);
      if (it || a.dataset.bookItem === "other") {
        S.other = !it; S.item = it || null;
        const d = Number(a.dataset.bookDur); S.dur = it && s.durations.includes(d) && itemPrice(s, it, d) > 0 ? d : null;
        go("price");
      }
    }
    if (a.dataset.bookItem && s.mode === "items") {
      const it = s.items.find((i) => i.id === a.dataset.bookItem);
      if (it) { S.sel = { [it.id]: it.minQty || 1 }; if (s.variants && !S.variant) { /* choose AC type first */ } render(); }
    }
  });
});

// boot
const st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
render();
loadServices().then((cat) => {
  S.cat = cat;
  window.ZHBook = { catalog: cat, open: startService };
  document.dispatchEvent(new CustomEvent("zh-services", { detail: cat }));
  // <div id="zhBook" data-start="cleaning"> opens straight at that service (e.g. /cleaning.html)
  if (root.dataset.start && svcById(cat, root.dataset.start)) startService(root.dataset.start, true); else render();
}).catch(() => { root.innerHTML = `<div class="zb-load">Couldn't load services – call <a href="tel:+919220400950">+91 92204 00950</a>.</div>`; });
