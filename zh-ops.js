// ZippHive operations data layer — shared by manager.html and tech.html.
// Reads/writes the same Firestore "bookings" records the customer tracker (track.html) watches,
// so every change here shows up for the customer instantly.
//
// Assignment flow (fields on a booking):
//   manager assigns   -> techEmail=<tech>, offerName, assignState="pending", status "confirmed"
//                        (techName stays empty, so the customer does NOT see a technician yet)
//   technician accepts -> assignState="accepted", techName/techPhone/techPhoto, status "assigned"
//                        (customer tracker moves to "Technician assigned" and shows the technician card)
//   technician declines-> assignState="declined", techEmail cleared, declinedByName/declineReason
//                        (booking goes back to the manager's "Needs action" list)

const SDK = "https://www.gstatic.com/firebasejs/10.14.1/";

export const STATUS = {
  new: "Booking received",
  confirmed: "Confirmed",
  assigned: "Technician assigned",
  on_the_way: "Technician on the way",
  arrived: "Technician arrived",
  in_progress: "Repair in progress",
  completed: "Completed",
  cancelled: "Cancelled",
};
export const CLOSED = ["completed", "cancelled"];

export const cfg = () => window.ZIPPHIVE || {};
export const admins = () => (cfg().admins || ["zipphive@gmail.com"]).map((e) => e.toLowerCase());
export const siteUrl = () => (cfg().siteUrl || location.origin).replace(/\/$/, "");
export const trackUrl = (id) => `${siteUrl()}/track.html?b=${id}`;
export const reviewUrl = () => (cfg().googleReviewUrl || "").trim();
export const invoiceUrl = (id) => `${siteUrl()}/invoice.html?b=${id}`;
export const business = () => ({
  name: "ZippHive", tagline: "Doorstep phone & home repairs", address: "India",
  phone: "+91 92204 00950", email: "hello@zipphive.com", web: "www.zipphive.com", gstin: "",
  ...(cfg().business || {}),
});
// Invoice number from the booking code: ZH-QE4YM -> INV-QE4YM
const rnd = (n, abc) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (x) => abc[x % abc.length]).join("");
const newId = () => rnd(20, "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789");
const newCode = () => "ZH-" + rnd(5, "ABCDEFGHJKLMNPQRSTUVWXYZ23456789");
// Tell the Google Sheet a booking changed so its "Bookings" tab refreshes now (it also syncs every 5 min on its own)
let pingT = null;
export function pingSheet() {
  const url = (cfg().warrantySheetUrl || "").trim();
  if (!url) return;
  clearTimeout(pingT);
  pingT = setTimeout(() => {
    try { fetch(url, { method: "POST", mode: "no-cors", keepalive: true, body: JSON.stringify({ action: "sync" }) }).catch(() => {}); } catch {}
  }, 4000);
}
export const isWarranty = (b) => b && b.kind === "warranty";
// Store manager's warranty decision (booking.warrantyReview):
//   { decision: "approved" | "rejected", defect: what was found, reason: why not covered, at, by }
export const W_REASONS = [
  "Physical damage (drop / crack / pressure)",
  "Liquid / water damage",
  "New fault – not related to our repair",
  "Warranty period is over",
  "Device opened / repaired elsewhere",
  "Seal or warranty sticker broken",
  "No defect found – working fine",
];
export function warrantyInfo(b) {
  if (!isWarranty(b)) return null;
  const r = b.warrantyReview || null;
  const state = r?.decision === "approved" ? "approved" : r?.decision === "rejected" ? "rejected" : "pending";
  const label = state === "approved" ? "Warranty approved – covered" : state === "rejected" ? "Not covered under warranty" : "Warranty check pending";
  return { state, label, defect: r?.defect || "", reason: r?.reason || "", at: r?.at, by: r?.by || "" };
}
export const invoiceNo = (b) => "INV-" + String(b.code || b.id).replace(/^ZH-/, "");
export const waLink = (mobile, text) => {
  const d = String(mobile || "").replace(/\D/g, "");
  const n = d.length === 10 ? "91" + d : d;
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
};
export const ago = (t) => {
  if (!t) return "";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
export const when = (t) =>
  t ? new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";
export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ---------- Firestore backend ----------
async function firebaseBackend(conf) {
  const [{ initializeApp }, auth, fs] = await Promise.all([
    import(SDK + "firebase-app.js"),
    import(SDK + "firebase-auth.js"),
    import(SDK + "firebase-firestore.js"),
  ]);
  const app = initializeApp(conf);
  const a = auth.getAuth(app);
  const db = fs.getFirestore(app);
  const withId = (d) => ({ ...d.data(), id: d.id });
  const bk = (id) => fs.doc(db, "bookings", id);
  // Finish an email-link sign-in (staff with non-Google emails, e.g. Yahoo) when the page is opened from the link
  if (auth.isSignInWithEmailLink(a, location.href)) {
    let em = "";
    try { em = localStorage.getItem("zh-signin-email") || ""; } catch {}
    if (!em) em = (window.prompt("Confirm your email to finish signing in") || "").trim();
    if (em) {
      try {
        await auth.signInWithEmailLink(a, em, location.href);
        try { localStorage.removeItem("zh-signin-email"); } catch {}
      } catch (e) { setTimeout(() => toast("Sign-in link expired or already used – request a new one", true), 300); }
    }
    history.replaceState(null, "", location.pathname);
  }

  return {
    mode: "firebase",
    onUser: (cb) =>
      auth.onAuthStateChanged(a, (u) => cb(u && u.email ? { email: u.email.toLowerCase(), name: u.displayName || "" } : null)),
    signIn: async () => {
      const p = new auth.GoogleAuthProvider();
      p.setCustomParameters({ prompt: "select_account" });
      try {
        await auth.signInWithPopup(a, p);
      } catch (e) {
        const c = e.code || "";
        if (c.includes("popup-blocked") || c.includes("operation-not-supported")) await auth.signInWithRedirect(a, p);
        else throw e;
      }
    },
    // Passwordless sign-in for any email (Yahoo, Outlook…): Firebase emails a one-time link
    sendSignInLink: async (email) => {
      await auth.sendSignInLinkToEmail(a, email, { url: location.origin + location.pathname, handleCodeInApp: true });
      try { localStorage.setItem("zh-signin-email", email); } catch {}
    },
    signOut: () => auth.signOut(a),
    watchAllBookings: (cb, err) =>
      fs.onSnapshot(
        fs.query(fs.collection(db, "bookings"), fs.orderBy("createdAt", "desc"), fs.limit(300)),
        (s) => cb(s.docs.map(withId)),
        err
      ),
    watchJobs: (email, cb, err) =>
      fs.onSnapshot(
        fs.query(fs.collection(db, "bookings"), fs.where("techEmail", "==", email.toLowerCase()), fs.limit(100)),
        (s) => cb(s.docs.map(withId).sort((x, y) => y.createdAt - x.createdAt)),
        err
      ),
    updateBooking: (id, patch) => fs.updateDoc(bk(id), patch),
    // new booking (used by the warranty claim page); customers may only create, never edit
    createBooking: async (data) => {
      const id = newId(), code = newCode(), now = Date.now();
      await fs.setDoc(bk(id), { ...data, code, status: "new", createdAt: now, statusAt: now });
      pingSheet();
      return { id, code };
    },
    // single booking, no sign-in needed (customers open it by its secret link)
    watchBooking: (id, cb, err) => fs.onSnapshot(bk(id), (d) => cb(d.exists() ? { ...d.data(), id: d.id } : null), err),
    listTechs: async () => (await fs.getDocs(fs.collection(db, "technicians"))).docs.map((d) => d.data()),
    getTech: async (email) => {
      const d = await fs.getDoc(fs.doc(db, "technicians", email.toLowerCase()));
      return d.exists() ? d.data() : null;
    },
    isManager: async (email) => {
      if (admins().includes(email)) return true;
      try {
        return (await fs.getDoc(fs.doc(db, "managers", email))).exists();
      } catch {
        return false;
      }
    },
    listManagers: async () => (await fs.getDocs(fs.collection(db, "managers"))).docs.map((d) => d.data()),
    saveManager: (m) => fs.setDoc(fs.doc(db, "managers", m.email.toLowerCase()), { ...m, email: m.email.toLowerCase() }),
    deleteManager: (email) => fs.deleteDoc(fs.doc(db, "managers", email.toLowerCase())),
    // time slots: settings in content/slots (admin), usage counters in slotUse/{yyyy-mm-dd} = { n: { "phone_0900": 1 } }
    getSlotConfig: async () => {
      const d = await fs.getDoc(fs.doc(db, "content", "slots"));
      return d.exists() ? d.data() : null;
    },
    saveSlotConfig: (c) => fs.setDoc(fs.doc(db, "content", "slots"), { ...c, updatedAt: Date.now() }),
    // service price list for the booking flow (content/services) and phone price overrides (prices/overrides)
    getServiceCatalog: async () => {
      const d = await fs.getDoc(fs.doc(db, "content", "services"));
      return d.exists() ? d.data() : null;
    },
    saveServiceCatalog: (c) => fs.setDoc(fs.doc(db, "content", "services"), { ...c, updatedAt: Date.now() }),
    // serviceable area (content/serviceArea): pincodes, pincode prefixes and map zones – edited on /areas.html
    getServiceArea: async () => {
      const d = await fs.getDoc(fs.doc(db, "content", "serviceArea"));
      return d.exists() ? d.data() : null;
    },
    saveServiceArea: (c) => fs.setDoc(fs.doc(db, "content", "serviceArea"), { ...c, updatedAt: Date.now() }),
    getPriceOverrides: async () => {
      const d = await fs.getDoc(fs.doc(db, "prices", "overrides"));
      return d.exists() ? d.data() : {};
    },
    // anonymous website funnel counters: stats/{yyyy-mm-dd} = { n: { visit: 120, step_slot: 30, booked: 9 } }
    bumpStat: (day, key) => fs.setDoc(fs.doc(db, "stats", day), { n: { [key]: fs.increment(1) } }, { merge: true }),
    getStats: async (from, to) => {
      const q = fs.query(fs.collection(db, "stats"), fs.where(fs.documentId(), ">=", from), fs.where(fs.documentId(), "<=", to));
      return Object.fromEntries((await fs.getDocs(q)).docs.map((d) => [d.id, d.data().n || {}]));
    },
    getSlotUse: async (dates) => {
      const out = {};
      await Promise.all(dates.map(async (d) => {
        try { const x = await fs.getDoc(fs.doc(db, "slotUse", d)); out[d] = x.exists() ? x.data().n || {} : {}; } catch { out[d] = {}; }
      }));
      return out;
    },
    bumpSlot: (key, by) => {
      const [date, k] = String(key).split("/");
      return fs.setDoc(fs.doc(db, "slotUse", date), { n: { [k]: fs.increment(by) } }, { merge: true });
    },
    setSlotUse: (date, n) => fs.setDoc(fs.doc(db, "slotUse", date), { n }),
  };
}

// ---------- Local test backend (same localStorage keys as the site's own mock mode) ----------
function mockBackend() {
  // sign-in is kept per page so a manager and a technician can be tested side by side in one browser
  const K = { bk: "zhmock:bookings", techs: "zhmock:techs", user: "zhmock:user:" + location.pathname, mgr: "zhmock:managers" };
  const get = (k, d) => {
    try {
      const v = localStorage.getItem(k);
      return v ? JSON.parse(v) : d;
    } catch {
      return d;
    }
  };
  const put = (k, v) => {
    localStorage.setItem(k, JSON.stringify(v));
    window.dispatchEvent(new CustomEvent("zhmock", { detail: k }));
  };
  const watch = (keys, fn) => {
    const s = (e) => e.key && keys.includes(e.key) && fn();
    const c = (e) => keys.includes(e.detail) && fn();
    window.addEventListener("storage", s);
    window.addEventListener("zhmock", c);
    fn();
    return () => {
      window.removeEventListener("storage", s);
      window.removeEventListener("zhmock", c);
    };
  };
  const all = () => Object.values(get(K.bk, {}));
  return {
    mode: "mock",
    onUser: (cb) => watch([K.user], () => cb(get(K.user, null))),
    signIn: async () => {
      const e = window.prompt("Test sign-in: enter email") || "";
      if (e) put(K.user, { email: e.toLowerCase() });
    },
    sendSignInLink: async (email) => put(K.user, { email: email.toLowerCase() }),
    signOut: async () => put(K.user, null),
    watchAllBookings: (cb) => watch([K.bk], () => cb(all().sort((a, b) => b.createdAt - a.createdAt))),
    watchJobs: (email, cb) =>
      watch([K.bk], () => cb(all().filter((b) => b.techEmail === email.toLowerCase()).sort((a, b) => b.createdAt - a.createdAt))),
    watchBooking: (id, cb) => watch([K.bk], () => cb(get(K.bk, {})[id] || null)),
    createBooking: async (data) => {
      const id = newId(), code = newCode(), now = Date.now(), m = get(K.bk, {});
      m[id] = { ...data, id, code, status: "new", createdAt: now, statusAt: now };
      put(K.bk, m);
      return { id, code };
    },
    updateBooking: async (id, patch) => {
      const m = get(K.bk, {});
      if (m[id]) {
        m[id] = { ...m[id], ...patch };
        put(K.bk, m);
      }
    },
    listTechs: async () => Object.values(get(K.techs, {})),
    getTech: async (email) => get(K.techs, {})[email.toLowerCase()] || null,
    isManager: async (email) => admins().includes(email) || !!get(K.mgr, {})[email],
    listManagers: async () => Object.values(get(K.mgr, {})),
    saveManager: async (m) => {
      const x = get(K.mgr, {});
      x[m.email.toLowerCase()] = { ...m, email: m.email.toLowerCase() };
      put(K.mgr, x);
    },
    deleteManager: async (email) => {
      const x = get(K.mgr, {});
      delete x[email.toLowerCase()];
      put(K.mgr, x);
    },
    getSlotConfig: async () => get("zhmock:slots", null),
    getServiceCatalog: async () => get("zhmock:services", null),
    saveServiceCatalog: async (c) => put("zhmock:services", { ...c, updatedAt: Date.now() }),
    getServiceArea: async () => get("zhmock:serviceArea", null),
    saveServiceArea: async (c) => put("zhmock:serviceArea", { ...c, updatedAt: Date.now() }),
    getPriceOverrides: async () => get("zhmock:overrides", {}),
    saveSlotConfig: async (c) => put("zhmock:slots", { ...c, updatedAt: Date.now() }),
    bumpStat: async (day, key) => { const st = get("zhmock:stats", {}); (st[day] ||= {}); st[day][key] = (st[day][key] || 0) + 1; put("zhmock:stats", st); },
    getStats: async (from, to) => Object.fromEntries(Object.entries(get("zhmock:stats", {})).filter(([d]) => d >= from && d <= to)),
    getSlotUse: async (dates) => { const u = get("zhmock:slotUse", {}); return Object.fromEntries(dates.map((d) => [d, u[d] || {}])); },
    bumpSlot: async (key, by) => {
      const [date, k] = String(key).split("/"), u = get("zhmock:slotUse", {});
      (u[date] ||= {})[k] = (u[date][k] || 0) + by;
      put("zhmock:slotUse", u);
    },
    setSlotUse: async (date, n) => { const u = get("zhmock:slotUse", {}); u[date] = n; put("zhmock:slotUse", u); },
  };
}

let _be = null;
export function backend() {
  if (!_be) {
    const f = cfg().firebase;
    _be = Promise.resolve(f === "mock" ? mockBackend() : f && f.projectId ? firebaseBackend(f) : null);
  }
  return _be;
}

// ---------- Assignment actions (one place, so manager and technician pages agree) ----------
// Store managers can send a job to a technician only from ASSIGN_WINDOW_H hours before the booked slot starts.
// Bookings without a slot ("as soon as possible") can be assigned any time.
export const ASSIGN_WINDOW_H = 3;
export function slotStart(b) {
  const m = /^(\d{4})-(\d{2})-(\d{2})\/.*_(\d{2})(\d{2})$/.exec((b && b.slot) || "");
  return m ? new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]).getTime() : null;
}
export const assignOpensAt = (b) => { const t = slotStart(b); return t ? t - ASSIGN_WINDOW_H * 3600000 : null; };
export const canAssignNow = (b, now = Date.now()) => { const o = assignOpensAt(b); return !o || now >= o; };
export const actions = {
  // Manager → offer the job to a technician (waits for their Accept)
  offer: (be, b, tech) =>
    be.updateBooking(b.id, {
      techEmail: tech.email,
      offerName: tech.name,
      techName: "",
      techPhone: "",
      techPhoto: "",
      assignState: "pending",
      offeredAt: Date.now(),
      declineReason: "",
      declinedByName: "",
      ...(["new", "assigned"].includes(b.status) ? { status: "confirmed", statusAt: Date.now() } : {}),
    }),
  // Manager → take the job back from a technician
  unassign: (be, b) =>
    be.updateBooking(b.id, {
      techEmail: "",
      offerName: "",
      techName: "",
      techPhone: "",
      techPhoto: "",
      assignState: "",
      ...(b.status === "assigned" ? { status: "confirmed", statusAt: Date.now() } : {}),
    }),
  confirm: (be, b) => be.updateBooking(b.id, { status: "confirmed", statusAt: Date.now() }),
  cancel: (be, b) => {
    // free the customer's time slot again
    if (b.slot && be.bumpSlot) be.bumpSlot(b.slot, -1).catch(() => {});
    return be.updateBooking(b.id, { status: "cancelled", statusAt: Date.now() });
  },
  setEta: (be, b, eta) => be.updateBooking(b.id, { eta }),
  // Manager → warranty decision after checking the defect (rec = { decision, defect, reason, at, by } or null to reopen)
  reviewWarranty: (be, b, rec) => be.updateBooking(b.id, { warrantyReview: rec }),
  // Technician → accept (customer now sees the technician)
  accept: (be, b, me) =>
    be.updateBooking(b.id, {
      assignState: "accepted",
      acceptedAt: Date.now(),
      techName: me.name || "",
      techPhone: me.phone || "",
      techPhoto: me.photo || "",
      status: "assigned",
      statusAt: Date.now(),
      times: { ...(b.times || {}), assigned: Date.now() },
    }),
  // Technician → decline (goes back to the manager)
  decline: (be, b, me, reason) =>
    be.updateBooking(b.id, {
      assignState: "declined",
      techEmail: "",
      offerName: "",
      declinedByName: me.name || me.email,
      declineReason: reason || "",
      declinedAt: Date.now(),
    }),
  step: (be, b, to) => {
    const now = Date.now();
    return be.updateBooking(b.id, { status: to, statusAt: now, times: { ...(b.times || {}), [to]: now } });
  },
  // Technician → save a quality check (pre or post). Called on every tap so the manager sees it live.
  saveQc: (be, b, which, qc) => be.updateBooking(b.id, { [which]: qc }),
  // Technician → record payment
  pay: (be, b, payment) =>
    be.updateBooking(b.id, { payment, times: { ...(b.times || {}), paid: payment.at } }),
  saveRemarks: (be, b, text) => be.updateBooking(b.id, { techRemarks: text }),
};

// ---------- Quality-check lists ----------
const L = (pairs) => pairs.map(([k, l]) => ({ k, l }));
export const CHECKLISTS = {
  phone: { name: "Phone", items: L([
    ["power", "Powers on / boots normally"], ["display", "Display – no lines, spots or flicker"],
    ["touch", "Touch works on full screen"], ["frontcam", "Front camera (photo + focus)"],
    ["rearcam", "Rear camera(s) + flash"], ["earpiece", "Earpiece (call audio)"],
    ["speaker", "Loudspeaker"], ["mic", "Microphone (call + recording)"],
    ["charging", "Charging port & charging"], ["battery", "Battery – no fast drain / swelling"],
    ["buttons", "Power & volume buttons"], ["network", "SIM, network & calling"],
    ["wifi", "Wi-Fi & Bluetooth"], ["biometric", "Fingerprint / Face unlock"],
    ["sensors", "Proximity & auto-rotate sensors"], ["vibration", "Vibration"],
    ["body", "Body, frame & back glass condition"],
  ]) },
  ac: { name: "AC", items: L([
    ["power", "Powers on"], ["cooling", "Cooling at vent"], ["airflow", "Indoor fan & airflow"],
    ["remote", "Remote & display"], ["outdoor", "Outdoor unit – compressor & fan"], ["gas", "Gas pressure"],
    ["drain", "No water leakage / drain OK"], ["noise", "No abnormal noise or vibration"],
    ["wiring", "Wiring, plug & stabiliser"], ["filter", "Filters & coil condition"],
  ]) },
  washing: { name: "Washing machine", items: L([
    ["power", "Powers on"], ["inlet", "Water inlet"], ["wash", "Wash / agitation"], ["spin", "Spin"],
    ["drain", "Drain"], ["door", "Door / lid lock"], ["leak", "No leakage"], ["noise", "No abnormal noise"],
    ["controls", "Controls & display"],
  ]) },
  plumbing: { name: "Plumbing", items: L([
    ["flow", "Water flow & pressure"], ["joints", "No leakage at joints"], ["drainage", "Drainage clear"],
    ["fittings", "Fittings secure"], ["area", "Work area cleaned"],
  ]) },
  electrical: { name: "Electrical", items: L([
    ["supply", "Power at points"], ["switches", "Switches & sockets work"], ["mcb", "MCB / earthing"],
    ["heat", "No sparking or heating"], ["insulation", "Wiring insulated & secured"], ["area", "Work area cleaned"],
  ]) },
  cleaning: { name: "Cleaning", items: L([
    ["scope", "All booked areas covered"], ["stains", "Stains / dirt removed"],
    ["damage", "No damage to items / surfaces"], ["dry", "Area dry & tidy"],
  ]) },
  appliance: { name: "Appliance", items: L([
    ["power", "Powers on"], ["function", "Main function works"], ["controls", "Controls & display"],
    ["noise", "No abnormal noise"], ["leak", "No leakage / physical damage"], ["wiring", "Wiring & plug"],
  ]) },
};
export function qcType(b) {
  if (b.kind === "phone" || b.device) return "phone";
  const s = `${b.service || ""} ${b.item || ""}`.toLowerCase();
  if (/\bac\b|air ?condition/.test(s)) return "ac";
  if (/wash/.test(s)) return "washing";
  if (/plumb|tap|pipe|leak/.test(s)) return "plumbing";
  if (/electric|wiring|switch|fan|light/.test(s)) return "electrical";
  if (/clean/.test(s)) return "cleaning";
  return "appliance";
}
export function newQc(b) {
  const t = qcType(b);
  return { type: t, items: CHECKLISTS[t].items.map((x) => ({ ...x, s: "", r: "" })), remark: "", startedAt: Date.now(), doneAt: 0 };
}
export function qcSum(qc) {
  const s = { total: 0, checked: 0, ok: 0, fault: 0, na: 0 };
  for (const i of qc?.items || []) { s.total++; if (i.s) { s.checked++; s[i.s]++; } }
  return s;
}
// Compare pre vs post: items that broke during repair, and faults still not fixed
export function qcCompare(pre, post) {
  const p = Object.fromEntries((pre?.items || []).map((i) => [i.k, i.s]));
  const out = { newIssues: [], stillFaulty: [] };
  for (const i of post?.items || []) {
    if (i.s !== "fault") continue;
    (p[i.k] === "fault" ? out.stillFaulty : out.newIssues).push(i);
  }
  return out;
}

// ---------- Payments ----------
export const PAY_MODES = ["UPI", "Cash", "Card"];
export const rupees = (n) => (n == null || n === "" ? "—" : "₹" + Number(n).toLocaleString("en-IN"));
// One view of a payment, old or new format:
//   new: { status: "paid" | "free" | "not_collected", charge, discount, discountType, reason, amount, mode, ref, note, at, by }
//   old: { status: "paid" | "not_collected", amount, mode, ref, note }
export function payInfo(b) {
  const p = b && b.payment;
  if (!p) return { state: "none" };
  const amount = Number(p.amount) || 0;
  const charge = p.charge != null ? Number(p.charge) || 0 : p.status === "paid" ? amount : Number(b.price) || 0;
  const discount = p.discount != null ? Number(p.discount) || 0 : 0;
  const state = p.status === "not_collected" ? "unpaid" : p.status === "free" || (p.status === "paid" && amount === 0) ? "free" : "paid";
  const reason = p.reason || "";
  const label = state === "paid" ? `${rupees(amount)} · ${p.mode || ""}`.replace(/ · $/, "")
    : state === "free" ? (p.discountType === "warranty" || (isWarranty(b) && b.warrantyReview?.decision !== "rejected") ? "No charge · warranty" : "No charge · 100% discount")
    : "Payment not collected";
  return { state, amount, charge, discount, reason, discountType: p.discountType || "", mode: p.mode || "", ref: p.ref || "", note: p.note || "", at: p.at, by: p.by || "", label };
}
export function upiLink(amount, code) {
  const id = cfg().upiId;
  if (!id) return "";
  const p = new URLSearchParams({ pa: id, pn: cfg().upiName || "ZippHive", cu: "INR", tn: `ZippHive ${code}` });
  if (amount) p.set("am", Number(amount).toFixed(2));
  return "upi://pay?" + p.toString();
}
export function qrSvg(text) {
  if (!text || !window.qrcode) return "";
  const q = window.qrcode(0, "M");
  q.addData(text);
  q.make();
  return q.createSvgTag({ cellSize: 5, margin: 2, scalable: true });
}

// What the technician is doing right now (manager view)
export function jobPhase(b) {
  const pre = qcSum(b.preQc), post = qcSum(b.postQc);
  switch (b.status) {
    case "assigned": return { label: "Accepted · not started", tone: "" };
    case "on_the_way": return { label: "On the way to customer", tone: "" };
    case "arrived":
      if (b.preQc?.doneAt) return { label: "Pre-repair check done · starting repair", tone: "" };
      if (b.preQc) return { label: `Pre-repair check in progress · ${pre.checked}/${pre.total}`, tone: "live" };
      return { label: "Arrived · pre-repair check not started", tone: "" };
    case "in_progress":
      if (b.payment) { const pi = payInfo(b); return { label: pi.state === "paid" ? `Payment received ${rupees(pi.amount)} · finishing` : pi.state === "free" ? `${pi.label} · finishing` : "Payment not collected · finishing", tone: pi.state === "unpaid" ? "warn" : "" }; }
      if (b.postQc?.doneAt) return { label: "Post-repair check done · collecting payment", tone: "live" };
      if (b.postQc) return { label: `Post-repair check in progress · ${post.checked}/${post.total}`, tone: "live" };
      return { label: "Repair in progress", tone: "live" };
    case "completed": return { label: "Completed", tone: "" };
    default: return { label: STATUS[b.status] || b.status, tone: "" };
  }
}

// Shared read-only job sheet (manager portal)
export function jobSheetHtml(b) {
  const icon = { ok: '<span class="qi ok" title="OK">✓</span>', fault: '<span class="qi bad" title="Not OK">✕</span>', na: '<span class="qi na" title="N/A">–</span>', "": '<span class="qi" title="Not checked">·</span>' };
  const pre = b.preQc, post = b.postQc;
  const cmp = qcCompare(pre, post);
  const newKeys = new Set(cmp.newIssues.map((i) => i.k));
  const rows = (pre?.items || post?.items || []).map((x) => {
    const a = pre?.items?.find((i) => i.k === x.k), z = post?.items?.find((i) => i.k === x.k);
    const rem = [a?.r && `Before: ${esc(a.r)}`, z?.r && `After: ${esc(z.r)}`].filter(Boolean).join("<br>");
    return `<tr class="${newKeys.has(x.k) ? "newbad" : ""}"><td>${esc(x.l)}</td><td>${icon[a?.s || ""]}</td><td>${post ? icon[z?.s || ""] : ""}</td><td class="rm">${rem}</td></tr>`;
  }).join("");
  const t = b.times || {};
  const tl = [["Accepted", b.acceptedAt], ["On the way", t.on_the_way], ["Arrived", t.arrived], ["Pre-check done", pre?.doneAt], ["Repair started", t.in_progress], ["Post-check done", post?.doneAt], ["Payment", t.paid], ["Completed", t.completed]]
    .filter(([, v]) => v).map(([k, v]) => `<li><b>${k}</b> ${when(v)}</li>`).join("");
  const pi = payInfo(b);
  const extra = [pi.charge !== pi.amount && pi.state !== "unpaid" ? `Charge ${rupees(pi.charge)}${pi.discount ? ` − discount ${rupees(pi.discount)}` : ""}` : "",
    b.price != null && pi.charge !== Number(b.price) && pi.state !== "unpaid" ? `Quoted ${rupees(b.price)}` : "", pi.reason, pi.note].filter(Boolean).map(esc).join(" — ");
  const payHtml = pi.state === "paid"
    ? `<div class="pay ok"><b>${rupees(pi.amount)} received · ${esc(pi.mode)}</b>${pi.ref ? ` · Ref ${esc(pi.ref)}` : ""}${extra ? `<div class="muted">${extra}</div>` : ""}</div>`
    : pi.state === "free" ? `<div class="pay ok"><b>${esc(pi.label)}</b>${extra ? `<div class="muted">${extra}</div>` : ""}</div>`
    : pi.state === "unpaid" ? `<div class="pay bad"><b>Payment not collected</b>${pi.note ? ` — ${esc(pi.note)}` : ""}</div>`
    : `<div class="muted">Not collected yet${b.price ? ` · due ${rupees(b.price)}` : isWarranty(b) ? " · warranty job" : ""}</div>`;
  const w = b.warranty, wi = warrantyInfo(b);
  return `<div class="sheet">
    ${wi ? `<p class="pay ${wi.state === "approved" ? "ok" : wi.state === "rejected" ? "bad" : ""}" style="${wi.state === "pending" ? "background:#FFF6D9;color:#7A5A00" : ""}"><b>${wi.state === "approved" ? "✅" : wi.state === "rejected" ? "❌" : "⏳"} ${esc(wi.label)}</b>${wi.defect ? `<br>Defect found: ${esc(wi.defect)}` : ""}${wi.reason ? `<br>Reason: ${esc(wi.reason)}` : ""}${wi.at ? `<br><span class="muted">${when(wi.at)}${wi.by ? " · " + esc(wi.by) : ""}</span>` : ""}</p>` : ""}
    ${w ? `<p class="rmk"><b>🛡️ Warranty claim ${esc(w.claimId || "")}</b> — original ${w.origBookingId ? `<a href="${invoiceUrl(w.origBookingId)}" target="_blank" rel="noopener">${esc(w.invoiceNo || w.origCode || "invoice")}</a>` : esc(w.invoiceNo || w.origCode || "repair not linked")}${w.repairDate ? ` · repaired ${esc(w.repairDate)}` : ""}${w.technician ? ` by ${esc(w.technician)}` : ""}${w.since ? ` · problem since: ${esc(w.since)}` : ""}${w.photo ? `<br><a href="${esc(w.photo)}" target="_blank" rel="noopener"><img src="${esc(w.photo)}" alt="Customer photo" style="width:140px;height:140px;object-fit:cover;border-radius:8px;margin-top:6px"></a>` : ""}</p>` : ""}
    ${pre || post ? `<table class="qc"><thead><tr><th>Check (${esc(CHECKLISTS[(pre || post).type]?.name || "")})</th><th>Before</th><th>After</th><th>Remarks</th></tr></thead><tbody>${rows}</tbody></table>
      ${pre?.remark ? `<p class="rmk"><b>Before repair:</b> ${esc(pre.remark)}</p>` : ""}${post?.remark ? `<p class="rmk"><b>After repair:</b> ${esc(post.remark)}</p>` : ""}
      ${cmp.newIssues.length ? `<p class="alert">⚠ Not OK after repair but OK before: ${cmp.newIssues.map((i) => esc(i.l)).join(", ")}</p>` : ""}`
      : `<p class="muted">Quality check not started yet.</p>`}
    ${b.techRemarks ? `<p class="rmk"><b>Technician remarks:</b> ${esc(b.techRemarks)}</p>` : ""}
    <div class="sheet-row"><div><h4>Payment</h4>${payHtml}</div><div><h4>Timeline</h4><ul class="tl">${tl || '<li class="muted">—</li>'}</ul></div></div>
  </div>`;
}

// every job change from the dashboard / technician app also refreshes the Google Sheet
for (const k of Object.keys(actions)) {
  const fn = actions[k];
  actions[k] = (...a) => { const r = fn(...a); Promise.resolve(r).then(pingSheet, () => {}); return r; };
}

// Which bucket a booking is in, from the manager's point of view
export function stage(b) {
  if (b.status === "cancelled") return "cancelled";
  if (b.status === "completed") return "done";
  if (b.status === "new") return "new";
  if (b.assignState === "pending" && b.techEmail) return "waiting";
  if (b.assignState === "declined" && !b.techEmail) return "declined";
  if (!b.techEmail) return "unassigned";
  return "active";
}

// Small toast
export function toast(msg, bad) {
  let t = document.getElementById("zh-toast");
  if (!t) {
    t = document.createElement("div");
    t.id = "zh-toast";
    t.setAttribute("role", "status");
    document.body.appendChild(t);
  }
  if (/permission|insufficient/i.test(msg)) {
    msg = "Blocked by Firebase rules – the admin must publish the latest firestore.rules in Firebase console";
    bad = true;
  }
  t.textContent = msg;
  t.className = "show" + (bad ? " bad" : "");
  clearTimeout(t._h);
  t._h = setTimeout(() => (t.className = ""), 2600);
}
