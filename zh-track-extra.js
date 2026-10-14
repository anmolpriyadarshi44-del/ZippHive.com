// Adds payment, invoice and quality-check report to the customer tracking page (track.html).
// Runs alongside the existing tracker without changing it; updates live as the technician works.
import { backend, esc, rupees, when, invoiceUrl, qcSum, payInfo, isWarranty } from "/zh-ops.js?v=7";

const id = new URLSearchParams(location.search).get("b");

const css = `
.zhx .card{margin-bottom:12px}
.zhx h3{margin:0 0 6px}
.zhx .paid{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.zhx .amt{font-family:Poppins,Inter,system-ui,sans-serif;font-size:24px;font-weight:800;color:#053E40}
.zhx .ok{color:#1E8E3E;font-weight:700}
.zhx .due{color:#C62828;font-weight:700}
.zhx ul{margin:6px 0 0;padding-left:18px}
.zhx li{margin:2px 0}
.zhx .bad{color:#C62828}
.zhx .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
.zhx .muted{color:#5B6F6F;font-size:13.5px}
`;

function view(b) {
  const p = b.payment, pre = b.preQc, post = b.postQc;
  const parts = [];
  if (p) {
    const pi = payInfo(b), paid = pi.state === "paid", free = pi.state === "free";
    parts.push(`<div class="card">
      <h3>${free ? (isWarranty(b) ? "Covered under warranty" : "No charge") : paid ? "Payment received" : "Payment pending"}</h3>
      <div class="paid"><span class="amt">${rupees(paid || free ? pi.amount : Math.max(0, pi.charge - pi.discount))}</span>
        ${free ? `<span class="ok">✓ Nothing to pay</span>` : paid ? `<span class="ok">✓ Paid by ${esc(pi.mode)}${pi.ref ? ` · Ref ${esc(pi.ref)}` : ""}</span>` : `<span class="due">Not paid yet</span>`}</div>
      <div class="muted">${pi.discount && !free ? `Includes discount of ${rupees(pi.discount)} · ` : ""}${when(pi.at)}${paid && pi.by ? ` · collected by ${esc(pi.by)}` : ""}</div>
      <div class="row"><a class="btn" href="${invoiceUrl(b.id)}">🧾 View / download invoice</a>${b.status === "completed" && !isWarranty(b) ? `<a class="btn o" href="/warranty.html?b=${encodeURIComponent(b.id)}">🛡️ Warranty claim</a>` : ""}</div>
    </div>`);
  }
  if (pre?.doneAt) {
    const preBad = pre.items.filter((i) => i.s === "fault");
    const postBad = (post?.items || []).filter((i) => i.s === "fault");
    const s = qcSum(post);
    parts.push(`<div class="card">
      <h3>Quality check report</h3>
      <div class="muted">Your ${b.device ? "device" : "appliance"} was tested before${post?.doneAt ? " and after" : ""} the repair.</div>
      <p style="margin:10px 0 0"><b>Before repair:</b> ${preBad.length ? `${preBad.length} issue${preBad.length > 1 ? "s" : ""} found` : `<span class="ok">no issues found</span>`}</p>
      ${preBad.length ? `<ul class="bad">${preBad.map((i) => `<li>${esc(i.l)}${i.r ? ` — ${esc(i.r)}` : ""}</li>`).join("")}</ul>` : ""}
      ${post?.doneAt ? `<p style="margin:10px 0 0"><b>After repair:</b> ${postBad.length ? `<span class="due">${postBad.length} item${postBad.length > 1 ? "s need" : " needs"} attention</span>` : `<span class="ok">✓ all ${s.ok} functions working</span>`}</p>
        ${postBad.length ? `<ul class="bad">${postBad.map((i) => `<li>${esc(i.l)}${i.r ? ` — ${esc(i.r)}` : ""}</li>`).join("")}</ul>` : ""}`
        : `<p class="muted" style="margin:10px 0 0">After-repair check will appear here when the repair is finished.</p>`}
      <div class="row"><a class="btn o" href="${invoiceUrl(b.id)}#qc">📋 Full report (before &amp; after)</a></div>
    </div>`);
  }
  return parts.join("");
}

if (id) {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  const box = document.createElement("div");
  box.className = "wrap zhx";
  box.style.maxWidth = "720px";
  box.style.paddingTop = "0";
  document.getElementById("root").after(box);
  backend().then((be) => be && be.watchBooking(id, (b) => { box.innerHTML = b ? view(b) : ""; }, () => {}));
}
