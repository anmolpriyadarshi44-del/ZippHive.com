/**
 * ZippHive – all bookings → "Bookings" tab of the ZippHive sheet
 *
 * Reads every booking from Firebase (Firestore) and rewrites the "Bookings" tab with the latest
 * status, technician, quality checks and payment. Runs every 5 minutes, and straight away when the
 * website / dashboard / technician app pings it after a change. "Staff notes" typed in the sheet are kept.
 *
 * Lives in the same Apps Script project as warranty-claims.gs (uses its SHEET_ID).
 * Setup: see the steps at the top of the chat message / README – add this file, replace appsscript.json,
 * run setupBookingSync once, then Deploy → Manage deployments → ✏️ → New version.
 */

const FIREBASE_PROJECT = "zipphive-1a2b3";
const BOOKINGS_TAB = "Bookings";
const SITE = "https://www.zipphive.com";

const BOOKING_COLS = [
  "Booking code", "Booked at", "Status", "Type", "Customer", "Mobile", "Area", "Preferred time",
  "Service", "Device", "Repair / item", "Problem", "Quoted ₹",
  "Technician", "Tech phone", "Confirmation sent", "Accepted at", "On the way", "Arrived", "Repair started", "Completed at",
  "Issues before repair", "Issues after repair", "Total charge ₹", "Discount ₹", "Discount reason",
  "Paid ₹", "Payment", "Payment ref", "Paid at", "Technician remarks", "Warranty claim", "Original invoice",
  "Tracking link", "Invoice link", "Last change", "Booking ID", "Staff notes",
  // added later – kept at the end so existing Staff notes stay in their column
  "Warranty decision", "Warranty defect found", "Not-covered reason", "Decided by", "Decided at",
];
const STATUS_LABEL = {
  new: "New", confirmed: "Confirmed", assigned: "Technician assigned", on_the_way: "On the way",
  arrived: "Arrived", in_progress: "Repair in progress", completed: "Completed", cancelled: "Cancelled",
};
const MASK = ["code", "createdAt", "status", "statusAt", "kind", "service", "device", "item", "problem", "price",
  "name", "mobile", "area", "time", "note", "eta", "techName", "techPhone", "offerName", "assignState", "acceptedAt",
  "declinedByName", "declineReason", "confirmSentAt", "times", "preQc", "postQc", "payment", "techRemarks",
  "warranty.claimId", "warranty.invoiceNo", "warranty.origCode", "warrantyReview"];

/** Run once from the editor: formats the tab, sets India time, adds the 5-minute timer, does a first sync. */
function setupBookingSync() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  ss.setSpreadsheetTimeZone("Asia/Kolkata");
  bookingsSheet_();
  ScriptApp.getProjectTriggers().filter((t) => t.getHandlerFunction() === "syncBookings").forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("syncBookings").timeBased().everyMinutes(5).create();
  const n = syncBookings();
  Logger.log(`Synced ${n} bookings → ${ss.getUrl()}`);
}

/** Called by the timer, by the "ZippHive → Sync bookings now" menu, and by pings from the website. */
function syncBookings() {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return -1;
  try {
    const docs = fetchBookings_();
    const sh = bookingsSheet_();
    // keep staff notes typed in the sheet
    const notes = {};
    const last = sh.getLastRow();
    if (last > 1) {
      const idCol = BOOKING_COLS.indexOf("Booking ID") + 1, noteCol = BOOKING_COLS.indexOf("Staff notes") + 1;
      const ids = sh.getRange(2, idCol, last - 1, 1).getValues(), ns = sh.getRange(2, noteCol, last - 1, 1).getValues();
      ids.forEach((r, i) => { if (r[0] && ns[i][0] !== "") notes[r[0]] = ns[i][0]; });
    }
    docs.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    const rows = docs.map((b) => bookingRow_(b, notes[b.id] || ""));
    if (last > 1) sh.getRange(2, 1, last - 1, BOOKING_COLS.length).clearContent();
    if (rows.length) sh.getRange(2, 1, rows.length, BOOKING_COLS.length).setValues(rows);
    try { markClaims_(docs); } catch (e) { /* claims tab is optional */ }
    CacheService.getScriptCache().put("lastSync", String(Date.now()), 3600);
    return rows.length;
  } finally {
    lock.releaseLock();
  }
}

/** Warranty claims tab: set Status to the store manager's decision (only moves forward from New / Called / Visit booked). */
function markClaims_(docs) {
  const sh = sheet_();
  const last = sh.getLastRow();
  if (last < 2) return;
  const ids = sh.getRange(2, 2, last - 1, 2).getValues(); // [Claim ID, Status]
  docs.forEach((b) => {
    const r = b.warrantyReview, cid = b.warranty && b.warranty.claimId;
    if (!cid || !r || !r.decision) return;
    const want = r.decision === "approved" ? "Approved – free fix" : "Rejected – not covered";
    const i = ids.findIndex((x) => x[0] === cid);
    if (i < 0 || ids[i][1] === want || ["Closed"].includes(ids[i][1])) return;
    sh.getRange(i + 2, 3).setValue(want);
  });
}

/** Ping from the website (throttled so a burst of changes only syncs once). */
function syncFromPing_() {
  const c = CacheService.getScriptCache();
  if (c.get("pingWait")) return { ok: true, queued: true };
  c.put("pingWait", "1", 15);
  Utilities.sleep(3000); // let a burst of updates land first
  return { ok: true, synced: syncBookings() };
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu("ZippHive").addItem("Sync bookings now", "syncBookings").addToUi();
}

// ---------- Firestore (REST, as the sheet owner) ----------
function fetchBookings_() {
  const base = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/bookings`;
  const mask = MASK.map((f) => "mask.fieldPaths=" + encodeURIComponent(f)).join("&");
  const headers = { Authorization: "Bearer " + ScriptApp.getOAuthToken(), "X-Goog-User-Project": FIREBASE_PROJECT };
  const out = [];
  let token = "";
  do {
    const url = `${base}?pageSize=300&${mask}${token ? "&pageToken=" + encodeURIComponent(token) : ""}`;
    const res = UrlFetchApp.fetch(url, { headers, muteHttpExceptions: true });
    if (res.getResponseCode() !== 200) {
      throw new Error(`Firestore ${res.getResponseCode()}: ${res.getContentText().slice(0, 300)} – is this sheet owned by the Google account that owns the Firebase project ${FIREBASE_PROJECT}?`);
    }
    const j = JSON.parse(res.getContentText());
    (j.documents || []).forEach((d) => {
      const o = val_({ mapValue: { fields: d.fields || {} } });
      o.id = d.name.split("/").pop();
      out.push(o);
    });
    token = j.nextPageToken || "";
  } while (token);
  return out;
}

function val_(v) {
  if (!v) return null;
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return new Date(v.timestampValue).getTime();
  if ("nullValue" in v) return null;
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(val_);
  if ("mapValue" in v) {
    const o = {}, f = v.mapValue.fields || {};
    Object.keys(f).forEach((k) => (o[k] = val_(f[k])));
    return o;
  }
  return null;
}

// ---------- one sheet row per booking ----------
function bookingRow_(b, note) {
  const t = b.times || {}, p = b.payment || null, w = b.warranty || null;
  const dt = (ms) => (ms ? new Date(ms) : "");
  const faults = (qc) => (qc && qc.doneAt ? ((qc.items || []).filter((i) => i.s === "fault").map((i) => i.l + (i.r ? ` (${i.r})` : "")).join("; ") || "None") : "");
  let payState = "", paid = "", charge = "", discount = "", reason = "", ref = "", paidAt = "";
  if (p) {
    const amount = Number(p.amount) || 0;
    charge = p.charge != null ? Number(p.charge) : p.status === "paid" ? amount : "";
    discount = p.discount != null ? Number(p.discount) || 0 : 0;
    reason = p.reason || (p.status === "not_collected" ? "" : p.note || "");
    payState = p.status === "not_collected" ? "Not collected" + (p.note ? ` – ${p.note}` : "")
      : p.status === "free" || amount === 0 ? (p.discountType === "warranty" || b.kind === "warranty" ? "Free – warranty" : "Free – 100% discount")
      : p.mode || "Paid";
    paid = p.status === "not_collected" ? 0 : amount;
    ref = p.ref || "";
    paidAt = dt(p.at);
  }
  const tech = b.techName || (b.assignState === "pending" ? `${b.offerName || ""} (waiting to accept)` : b.assignState === "declined" ? `Declined by ${b.declinedByName || "technician"}` : "");
  const r = b.warrantyReview || null;
  const decision = b.kind !== "warranty" ? "" : r && r.decision === "approved" ? "Approved – covered" : r && r.decision === "rejected" ? "Not covered" : "Pending check";
  const lastChange = Math.max(b.statusAt || 0, b.createdAt || 0, p && p.at ? p.at : 0, r && r.at ? r.at : 0);
  const row = {
    "Booking code": b.code || "", "Booked at": dt(b.createdAt), "Status": STATUS_LABEL[b.status] || b.status || "",
    "Type": b.kind === "warranty" ? "Warranty" : b.kind === "phone" ? "Phone repair" : "Home service",
    "Customer": b.name || "", "Mobile": b.mobile ? "'" + b.mobile : "", "Area": b.area || "", "Preferred time": b.time || "",
    "Service": b.service || "", "Device": b.device || "", "Repair / item": b.item || "", "Problem": b.problem || "",
    "Quoted ₹": b.price != null ? b.price : "",
    "Technician": tech, "Tech phone": b.techPhone || "", "Confirmation sent": dt(b.confirmSentAt),
    "Accepted at": dt(b.acceptedAt), "On the way": dt(t.on_the_way), "Arrived": dt(t.arrived), "Repair started": dt(t.in_progress),
    "Completed at": dt(t.completed || (b.status === "completed" ? b.statusAt : 0)),
    "Issues before repair": faults(b.preQc), "Issues after repair": faults(b.postQc),
    "Total charge ₹": charge, "Discount ₹": discount || "", "Discount reason": discount ? reason : "",
    "Paid ₹": paid, "Payment": payState, "Payment ref": ref, "Paid at": paidAt,
    "Technician remarks": b.techRemarks || "",
    "Warranty claim": w ? w.claimId || "" : "", "Original invoice": w ? w.invoiceNo || w.origCode || "" : "",
    "Tracking link": `${SITE}/track.html?b=${b.id}`, "Invoice link": p ? `${SITE}/invoice.html?b=${b.id}` : "",
    "Last change": dt(lastChange), "Booking ID": b.id, "Staff notes": note,
    "Warranty decision": decision, "Warranty defect found": r ? r.defect || "" : "", "Not-covered reason": r ? r.reason || "" : "",
    "Decided by": r ? r.by || "" : "", "Decided at": dt(r && r.at),
  };
  return BOOKING_COLS.map((c) => row[c]);
}

function bookingsSheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let sh = ss.getSheetByName(BOOKINGS_TAB);
  if (!sh) {
    sh = ss.insertSheet(BOOKINGS_TAB, 0);
  }
  const head = sh.getRange(1, 1, 1, BOOKING_COLS.length);
  if (head.getValues()[0].join("|") !== BOOKING_COLS.join("|")) {
    head.setValues([BOOKING_COLS]).setFontWeight("bold").setBackground("#053E40").setFontColor("#FFFFFF").setWrap(true);
    sh.setFrozenRows(1);
    sh.setFrozenColumns(1);
    const dateCols = ["Booked at", "Confirmation sent", "Accepted at", "On the way", "Arrived", "Repair started", "Completed at", "Paid at", "Last change", "Decided at"];
    dateCols.forEach((c) => sh.getRange(2, BOOKING_COLS.indexOf(c) + 1, 5000, 1).setNumberFormat("dd-mmm-yyyy hh:mm"));
    ["Quoted ₹", "Total charge ₹", "Discount ₹", "Paid ₹"].forEach((c) => sh.getRange(2, BOOKING_COLS.indexOf(c) + 1, 5000, 1).setNumberFormat("₹#,##0"));
    const st = BOOKING_COLS.indexOf("Status") + 1;
    const rules = [["Completed", "#E6F4EA", "#1E8E3E"], ["Cancelled", "#EEEEEE", "#666666"], ["New", "#FFF6D9", "#7A5A00"]]
      .map(([v, bg, fg]) => SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(v).setBackground(bg).setFontColor(fg).setRanges([sh.getRange(2, st, 5000, 1)]).build());
    const wd = sh.getRange(2, BOOKING_COLS.indexOf("Warranty decision") + 1, 5000, 1);
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Approved – covered").setBackground("#E6F4EA").setFontColor("#1E8E3E").setRanges([wd]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Not covered").setBackground("#FDECEC").setFontColor("#C62828").setRanges([wd]).build());
    rules.push(SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo("Pending check").setBackground("#FFF6D9").setFontColor("#7A5A00").setRanges([wd]).build());
    sh.setConditionalFormatRules(rules);
  }
  return sh;
}
