// Adds payment, invoice and quality-check report to the customer tracking page (track.html).
// Runs alongside the existing tracker without changing it; updates live as the technician works.
import { backend, esc, rupees, when, invoiceUrl, qcSum, payInfo, isWarranty, reviewUrl, warrantyInfo } from "/zh-ops.js?v=15";

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
.zhx .thanks{background:linear-gradient(160deg,#0B7F7D,#053E40);color:#fff;border:0;text-align:center;padding:24px 18px}
.zhx .thanks h3{color:#fff;font-size:22px;margin:6px 0 6px}
.zhx .thanks p{margin:0 auto;max-width:440px;color:#D7EFED;font-size:15px;line-height:1.5}
.zhx .thanks .big{font-size:40px;line-height:1}
.zhx .stars{font-size:30px;letter-spacing:4px;color:#FFC72C;margin:14px 0 8px}
.zhx .gbtn{display:inline-flex;align-items:center;justify-content:center;gap:10px;background:#fff;color:#0F2424;font-weight:800;font-size:16px;padding:13px 22px;border-radius:999px;text-decoration:none;box-shadow:0 8px 20px rgba(0,0,0,.2)}
.zhx .gbtn svg{width:20px;height:20px}
.zhx .wst{border:0;padding:18px}
.zhx .wst.pending{background:#FFF8E1}.zhx .wst.approved{background:#E6F4EA}.zhx .wst.rejected{background:#FDECEC}
.zhx .wst h3{font-size:19px}
.zhx .wst.approved h3{color:#1E8E3E}.zhx .wst.rejected h3{color:#C62828}
.zhx .wsteps{display:flex;gap:6px;margin:12px 0 4px}
.zhx .wsteps div{flex:1;text-align:center;font-size:12.5px;font-weight:700;color:#8A8A8A}
.zhx .wsteps i{display:block;height:6px;border-radius:6px;background:#E3E3E3;margin-bottom:6px}
.zhx .wsteps .on{color:#053E40}.zhx .wsteps .on i{background:#0B7F7D}
.zhx .wsteps .now{color:#8A5A00}.zhx .wsteps .now i{background:#E8A317}
.zhx .wbox{background:#fff;border-radius:10px;padding:10px 12px;margin-top:10px;font-size:14.5px}
.zhx .alt{display:inline-block;margin-top:12px;color:#BFE6E3;font-size:13.5px}
`;

function view(b) {
  const p = b.payment, pre = b.preQc, post = b.postQc;
  const parts = [];
  const wi = warrantyInfo(b);
  if (wi && b.status !== "cancelled") {
    const claim = b.warranty?.claimId ? ` ${esc(b.warranty.claimId)}` : "";
    const checked = !!b.preQc?.doneAt;
    const step = (label, st) => `<div class="${st}"><i></i>${label}</div>`;
    const steps = `<div class="wsteps">${step("Claim received", "on")}${step("Device checked", checked || wi.state !== "pending" ? "on" : "now")}${step(wi.state === "rejected" ? "Not covered" : wi.state === "approved" ? "Approved" : "Decision", wi.state !== "pending" ? "on" : checked ? "now" : "")}</div>`;
    const wa = `https://wa.me/919220400950?text=${encodeURIComponent(`Hi ZippHive, about my warranty claim${b.warranty?.claimId ? " " + b.warranty.claimId : ""} (booking ${b.code}): `)}`;
    parts.push(wi.state === "approved" ? `<div class="card wst approved">
        <h3>✅ Warranty approved</h3>
        <div>Good news — your claim${claim} is covered. The repair is <b>free</b>, you pay ₹0.</div>${steps}
        ${wi.defect ? `<div class="wbox"><b>Defect found:</b> ${esc(wi.defect)}</div>` : ""}
        <div class="muted" style="margin-top:8px">Approved ${when(wi.at)}</div></div>`
      : wi.state === "rejected" ? `<div class="card wst rejected">
        <h3>❌ Not covered under warranty</h3>
        <div>We checked your claim${claim} carefully. Sorry, this problem is not covered by the ZippHive warranty.</div>${steps}
        <div class="wbox"><b>Reason:</b> ${esc(wi.reason)}${wi.defect ? `<br><b>What we found:</b> ${esc(wi.defect)}` : ""}</div>
        <div class="muted" style="margin-top:8px">Checked ${when(wi.at)} · We can still repair it at our normal price.</div>
        <div class="row"><a class="btn wa" href="${wa}" target="_blank" rel="noopener">💬 Get a repair quote on WhatsApp</a></div></div>`
      : `<div class="card wst pending">
        <h3>🛡️ Warranty claim${claim} — under review</h3>
        <div>${checked ? "Our technician has checked your device. The store is confirming if it's covered — the decision will show here." : "Our technician will check your device, then the store confirms if it's covered under warranty. The decision will show here."}</div>${steps}
        <div class="muted" style="margin-top:6px">Questions? <a href="${wa}" target="_blank" rel="noopener">WhatsApp us</a></div></div>`);
  }
  if (b.status === "completed") {
    const first = String(b.name || "").trim().split(/\s+/)[0];
    const rv = reviewUrl();
    const g = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>';
    const fb = `https://wa.me/919220400950?text=${encodeURIComponent(`Hi ZippHive, feedback for booking ${b.code}: `)}`;
    parts.push(`<div class="card thanks">
      <div class="big">🙏</div>
      <h3>Thank you${first ? ", " + esc(first) : ""}!</h3>
      <p>Thanks for choosing ZippHive for your ${b.device ? esc(b.device) : "service"}${wi && wi.state !== "rejected" ? " warranty repair" : ""}. We hope everything works perfectly — we're always just a WhatsApp away.</p>
      ${rv ? `<div class="stars" aria-hidden="true">★★★★★</div>
        <p style="margin-bottom:14px">Happy with ${b.techName ? esc(b.techName) + "'s" : "our"} service? A quick Google review helps other families in Patna find us.</p>
        <a class="gbtn" href="${esc(rv)}" target="_blank" rel="noopener">${g}Rate us on Google</a><br>` : `<div style="height:14px"></div>`}
      <a class="alt" href="${fb}" target="_blank" rel="noopener">💬 Share feedback with us on WhatsApp</a>
    </div>`);
  }
  if (p) {
    const pi = payInfo(b), paid = pi.state === "paid", free = pi.state === "free";
    parts.push(`<div class="card">
      <h3>${free ? (wi && wi.state !== "rejected" ? "Covered under warranty" : "No charge") : paid ? "Payment received" : "Payment pending"}</h3>
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
