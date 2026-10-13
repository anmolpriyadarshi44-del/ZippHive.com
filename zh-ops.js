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
    signOut: async () => put(K.user, null),
    watchAllBookings: (cb) => watch([K.bk], () => cb(all().sort((a, b) => b.createdAt - a.createdAt))),
    watchJobs: (email, cb) =>
      watch([K.bk], () => cb(all().filter((b) => b.techEmail === email.toLowerCase()).sort((a, b) => b.createdAt - a.createdAt))),
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
  cancel: (be, b) => be.updateBooking(b.id, { status: "cancelled", statusAt: Date.now() }),
  setEta: (be, b, eta) => be.updateBooking(b.id, { eta }),
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
  step: (be, b, to) => be.updateBooking(b.id, { status: to, statusAt: Date.now() }),
};

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
  t.textContent = msg;
  t.className = "show" + (bad ? " bad" : "");
  clearTimeout(t._h);
  t._h = setTimeout(() => (t.className = ""), 2600);
}
