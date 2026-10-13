# ZippHive Website

Doorstep home & phone repair services in Patna. Static site — no build step, hosted free on GitHub Pages.

## Files
- `index.html` — the full website (bookings go to WhatsApp +91 92204 00950)
- `favicon.svg` — logo icon
- `404.html` — not-found page
- `CNAME` — your custom domain (edit to match your GoDaddy domain)

## Go live (GitHub Pages + GoDaddy)

1. **GitHub → Settings → Pages**: Source = *Deploy from a branch*, Branch = `main`, folder `/ (root)`. Save.
2. **Custom domain** on the same page: enter your domain (`www.zipphive.com`) and save.
3. **GoDaddy → My Products → Domain → DNS → Manage DNS**. Delete any existing `A` record for `@` and "Parked"/forwarding records, then add:

   | Type  | Name | Value                     |
   |-------|------|---------------------------|
   | A     | @    | 185.199.108.153           |
   | A     | @    | 185.199.109.153           |
   | A     | @    | 185.199.110.153           |
   | A     | @    | 185.199.111.153           |
   | CNAME | www  | `<your-github-username>.github.io` |

4. Wait 15 min – a few hours for DNS. Then tick **Enforce HTTPS** in GitHub Pages settings.

## Editing
Change phone number: search for `919220400950` in `index.html`. Services list lives in the `services` array in the script at the bottom.

## Store manager & technician job flow

| Page | Who | What |
|------|-----|------|
| `/manager.html` | Store manager (and admins) | See every booking, confirm, **send a job to a technician**, see who accepted / declined, set ETA, send the tracking link |
| `/tech.html` | Technician | Gets **job requests** (with sound + vibration), **Accept / Decline**, then Start trip → Arrived → Repair → Completed with live location |
| `/track.html?b=…` | Customer | Updates by itself at every step — no change needed |

How a job moves:

1. Manager picks a technician and taps **Send job** → booking shows *Confirmed* to the customer; technician gets a request.
2. Technician taps **Accept** → customer's tracker moves to *Technician assigned* and shows the technician's name, photo and call button.
   If they tap **Decline** (with a reason), the job goes back to the manager's *Needs action* list.
3. Technician taps through the steps; the customer sees each one live (and the map while they're on the way).

Files: `manager.html`, `tech.html`, `zh-ops.js` (shared logic), `zh-ops.css`, `firestore.rules`.

### One-time setup
1. **Firestore rules** – Firebase console → Firestore Database → Rules → paste `firestore.rules` → Publish.
   (Without this, technicians can't accept/decline and store managers can't load bookings.)
2. **Technicians** – add them in `/admin.html` → Technicians (name, Gmail, phone, photo, skills).
3. **Store managers** – sign in to `/manager.html` with the admin account (zipphive@gmail.com) and add their Gmail under *Store managers*.

Use `/manager.html` for bookings from now on — the old *Admin → Bookings* tab assigns directly without asking the technician.

### Testing without touching real data
Set `firebase: "mock"` in `zipphive-config.js` locally (don't commit it). All pages then share data through the browser's local storage; sign in by typing any email.
