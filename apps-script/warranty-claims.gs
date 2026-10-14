/**
 * ZippHive – Warranty claims → Google Sheet
 *
 * Receives warranty claims from www.zipphive.com/warranty.html and adds one row per claim to the
 * "ZippHive Warranty Claims" sheet. Photos are saved to a Drive folder and linked in the row.
 * An email alert goes to ALERT_EMAIL for every new claim.
 *
 * Setup (once, signed in as zipphive@gmail.com):
 *   1. Open the sheet → Extensions → Apps Script. Delete the sample code and paste this file. Save.
 *   2. Deploy → New deployment → type "Web app".
 *        Execute as: Me      Who has access: Anyone
 *      Click Deploy, allow the permissions, and copy the "Web app URL" (ends in /exec).
 *   3. Put that URL in zipphive-config.js as  warrantySheetUrl: "https://script.google.com/macros/s/…/exec"
 *
 * After editing this code later: Deploy → Manage deployments → ✏️ → Version: New version → Deploy
 * (the URL stays the same).
 */

const SHEET_ID = "1-gvSZkGUgYt7EELjet7o6--jjWGY2bYhZyp0fEau38k";
const SHEET_TAB = ""; // empty = first tab
const PHOTO_FOLDER = "ZippHive Warranty Photos";
const ALERT_EMAIL = "zipphive@gmail.com";

const HEADERS = [
  "Received at", "Claim ID", "Status", "Customer name", "Mobile", "Area", "Booking code", "Invoice no",
  "Device / service", "Original repair", "Repair date", "Technician", "Problem now", "Since when",
  "Photo", "Warranty job", "Tracking link", "Source page", "Staff notes",
];

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (d.website) return json({ ok: true, id: "" }); // spam trap filled → silently ignore

    const clean = (v, n) => String(v == null ? "" : v).replace(/^[=+\-@]/, "'$&").slice(0, n || 300);
    const mobile = String(d.mobile || "").replace(/\D/g, "").slice(-10);
    if (!clean(d.name) || !/^[6-9]\d{9}$/.test(mobile) || !clean(d.problem)) {
      return json({ ok: false, error: "Name, a valid 10-digit mobile and the problem are required." });
    }

    const id = /^WC-[A-Z0-9]{5,8}$/.test(d.claimId || "") ? d.claimId : "WC-" + Utilities.getUuid().slice(0, 6).toUpperCase();
    let photo = "";
    if (d.photo && /^data:image\/(jpeg|png|webp);base64,/.test(d.photo) && d.photo.length < 8e6) {
      const [meta, b64] = d.photo.split(",");
      const type = meta.slice(5, meta.indexOf(";"));
      const blob = Utilities.newBlob(Utilities.base64Decode(b64), type, id + "." + type.split("/")[1]);
      photo = folder_().createFile(blob).getUrl();
    }

    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try {
      const sh = sheet_();
      // same claim sent twice (e.g. a retry on a weak connection) → keep only the first row
      if (sh.getLastRow() > 1 && sh.getRange(2, 2, sh.getLastRow() - 1, 1).createTextFinder(id).matchEntireCell(true).findNext()) {
        return json({ ok: true, id, duplicate: true });
      }
      sh.appendRow([
        new Date(), id, "New", clean(d.name, 80), "'" + mobile, clean(d.area, 80), clean(d.bookingCode, 20), clean(d.invoiceNo, 20),
        clean(d.device, 120), clean(d.repair, 160), clean(d.repairDate, 40), clean(d.technician, 80),
        clean(d.problem, 1000), clean(d.since, 60), photo, clean(d.jobCode, 12), clean(d.trackUrl, 200), clean(d.page, 200), "",
      ]);
    } finally {
      lock.releaseLock();
    }

    try {
      MailApp.sendEmail({
        to: ALERT_EMAIL,
        subject: `New warranty claim ${id} – ${clean(d.name, 80)}`,
        body: [
          `Claim: ${id}`, `Customer: ${clean(d.name, 80)} · ${mobile} · ${clean(d.area, 80)}`,
          `Booking: ${clean(d.bookingCode, 20) || "—"}  Invoice: ${clean(d.invoiceNo, 20) || "—"}`,
          `Device / service: ${clean(d.device, 120)}`, `Original repair: ${clean(d.repair, 160)} (${clean(d.repairDate, 40) || "date not given"})`,
          `Problem now: ${clean(d.problem, 1000)}`, `Since: ${clean(d.since, 60)}`, photo ? `Photo: ${photo}` : "",
          d.jobCode ? `Warranty job ${clean(d.jobCode, 12)} is on the store manager dashboard – assign a technician there.` : "",
          d.trackUrl ? `Customer tracking: ${clean(d.trackUrl, 200)}` : "",
          ``, `Sheet: https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`,
        ].filter((x) => x !== "").join("\n"),
      });
    } catch (mailErr) { /* email quota or permission – the row is still saved */ }

    return json({ ok: true, id });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

// Visiting the web-app URL in a browser shows this – handy to check the deployment works.
function doGet() {
  return json({ ok: true, service: "ZippHive warranty claims", sheet: SHEET_ID });
}

function sheet_() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = SHEET_TAB ? ss.getSheetByName(SHEET_TAB) || ss.insertSheet(SHEET_TAB) : ss.getSheets()[0];
  if (sh.getLastRow() === 0) sh.appendRow(HEADERS);
  // keep the header row in step with HEADERS (the sheet was created with an earlier column list)
  const head = sh.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  if (head.join("|") !== HEADERS.join("|") && sh.getLastRow() <= 1) sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  if (sh.getFrozenRows() === 0) {
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#053E40").setFontColor("#FFFFFF");
    const status = SpreadsheetApp.newDataValidation().requireValueInList(["New", "Called", "Visit booked", "Approved – free fix", "Rejected – not covered", "Closed"], true).build();
    sh.getRange(2, 3, 1000, 1).setDataValidation(status);
  }
  return sh;
}

function folder_() {
  const it = DriveApp.getFoldersByName(PHOTO_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(PHOTO_FOLDER);
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

// Run this once from the editor (▶ Run → setup) to format the sheet and grant permissions before deploying.
function setup() {
  sheet_();
  folder_();
  Logger.log("Ready: " + SpreadsheetApp.openById(SHEET_ID).getUrl());
}
