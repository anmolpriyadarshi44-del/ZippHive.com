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

## Quality checks, payment & remarks (technician app)

Each job now goes: Trip → **Pre-repair check** → Repair → **Post-repair check** → **Payment** → Done.

- **Pre-repair check** (after "I have arrived"): every function is marked OK / Not OK / N/A. A Not OK item needs a remark. "Start repair" unlocks only after it's submitted.
- **Post-repair check**: the same list again, showing the "before" result beside each item. Anything OK before but Not OK after is flagged red for the manager.
- **Payment**: UPI / Cash / Card, amount collected (a reason is required if it differs from the quote), optional UTR / slip number, or "Customer couldn't pay now" with a reason. "Job completed" unlocks only after payment is recorded. One tap sends the customer a WhatsApp receipt.
- **Job remarks**: free text, saved automatically.

Checklists change with the service (phone, AC, washing machine, plumbing, electrical, cleaning, other appliances) — edit `CHECKLISTS` in `zh-ops.js`.

The store manager sees all of it live in `/manager.html`: current step ("Pre-repair check in progress · 6/17"), flags, and a **Job sheet** with before/after results, remarks, payment and a timeline, plus a **Collected today** total.

**UPI QR:** set `upiId` (e.g. `zipphive@ybl`) in `zipphive-config.js` and technicians will show a QR with the exact amount.

## Customer invoice & quality-check report

- `/invoice.html?b=<booking id>` — invoice (auto-numbered `INV-<booking code>`, PAID / DUE stamp, extra charges or discount as a separate line) plus the full before/after quality-check report. "Download / Print PDF" uses the browser's Save as PDF.
- The customer's tracking page (`track.html`) now shows a **Payment received** card with the invoice link and a **Quality check report** summary as soon as the technician records them (`zh-track-extra.js`, no change to the tracker itself).
- The technician's WhatsApp receipt and the manager's "Send invoice" button include the invoice link.
- Business details on the invoice (address, phone, GSTIN) can be set in `zipphive-config.js` as `business: { address: "...", gstin: "..." }`. GSTIN is hidden while empty.
- No Firestore rule change needed: customers read the booking by its secret link, exactly like tracking.

## Warranty claims → Google Sheet

- `/warranty.html` — customers raise a warranty claim (name, mobile, device, problem, optional photo). Opened from an invoice or tracking link (`warranty.html?b=<booking id>`) it pre-fills the repair, booking, invoice no. and technician.
- Each claim becomes a row in the **ZippHive Warranty Claims** Google Sheet (zipphive@gmail.com's Drive), with an email alert. Photos are saved to a Drive folder "ZippHive Warranty Photos" and linked in the row.
- The bridge is a Google Apps Script web app: `apps-script/warranty-claims.gs` (setup steps at the top of that file). Put its URL in `zipphive-config.js` → `warrantySheetUrl`. Until then, claims are sent to WhatsApp instead.

## Homepage layout
- The booking form now lives in its own section further down (`#book`); the hero shows the "start to finish" promise card. All "Book" buttons still scroll to the form.
- "Ask ZippHive AI" is on the bottom-right (`data-position="right"` on the widget script); the WhatsApp button moved to the bottom-left.

## Warranty jobs & discounts
- A claim on `/warranty.html` now **creates a job** (`kind: "warranty"`, price ₹0) in the same `bookings` collection, so it appears on `/manager.html` (🛡️ Warranty filter), is assigned and accepted like any booking, and the customer gets the normal tracking link. The claim is also copied to the Google Sheet (with the job code and tracking link) when `warrantySheetUrl` is set.
- Technician payment step: total charge → discount (**No discount / ₹ Discount / 100% free**, reason required) → "Customer pays". When it's ₹0 the technician taps "Confirm — no payment needed" and the invoice shows ₹0 (stamp "WARRANTY · ₹0" or "NO CHARGE"). Warranty jobs default to free.
- Needs the updated `firestore.rules` published (allows `kind: "warranty"` bookings from the website).

## Warranty check (store manager approves / rejects)
- Every warranty job shows a **🛡️ Warranty check** box on `/manager.html`: the customer's complaint and photo, the technician's pre-repair check, a "Defect / abnormality found" note, and **✅ Approve – covered (free)** or **❌ Not covered** (reason required; quick picks like physical / liquid damage, opened elsewhere, period over).
- A warranty job whose pre-repair check is done but undecided shows "Warranty decision needed" and sits in **Needs action**. After deciding, **📲 Send decision on WhatsApp** messages the customer.
- Customer tracking link shows *Under review → Approved → / Not covered* with the reason; the invoice shows the decision.
- Technician app: approved → defaults to ₹0; not covered → normal charge (no warranty label on the invoice).
- Stored as `warrantyReview: { decision, defect, reason, at, by, sentAt }`. The Google Sheet "Bookings" tab adds Warranty decision / defect / reason / decided by / at columns, and the claims tab Status follows the decision (update `bookings-sync.gs` in Apps Script and deploy a new version).

## Thank-you & Google review
- When a job is **completed**, the customer's tracking page shows a thank-you card with a **Rate us on Google** button and a WhatsApp feedback link. The review link is also added to the technician's WhatsApp invoice message and the invoice footer.
- Set `googleReviewUrl` in `zipphive-config.js` (Google Business Profile → *Ask for reviews* → copy link). While empty, the thank-you card shows without the Google button.

## Bookings land on the dashboard (no WhatsApp step for customers)
- The homepage form and the AI assistant now save bookings straight to Firestore. The customer sees "Booking received" with their booking ID and tracking link; WhatsApp only opens as a fallback if the booking can't be saved.
- `/manager.html` chimes, shows a toast and puts the count in the tab title for every new booking (browser notification too, if allowed).
- **✅ Confirm & send WhatsApp** marks the booking confirmed and opens WhatsApp with the confirmation + live tracking link for the customer (one tap to send). Bookings confirmed without it are flagged "Confirmation not sent".

## All bookings in Google Sheets
- The Apps Script project behind the warranty sheet also keeps a **Bookings** tab: one row per booking with status, customer, service, technician, timeline, issues before/after repair, charge / discount / paid / payment mode, warranty claim, tracking and invoice links. Typed "Staff notes" are kept.
- It reads Firestore directly as the sheet owner (`apps-script/bookings-sync.gs`, needs `apps-script/appsscript.json` for the Firestore permission), every 5 minutes, and immediately when the website, dashboard or technician app pings it after a change. Menu: *ZippHive → Sync bookings now*.

## Time slots (calendar booking)
- Customers pick a **date and a time slot** (homepage form and the AI assistant's booking forms) instead of "As soon as possible". Mobile repair and home services slots are 1 hour; cleaning slots are 45 minutes. Full, past and closed slots can't be picked; the earliest free slot is pre-selected.
- `/slots.html` (admin edits; store managers can view): opening hours, how many days ahead customers can book, minimum notice, weekly closed days, and **how many bookings each hour can take per service** (e.g. 9–10 AM: Mobile repair 2, Cleaning 4). The calendar shows booked/open per hour with booking codes, and lets the admin close a day (holiday) or change slots for one day only.
- Settings are saved in `content/slots`; booked counts in `slotUse/{date}`. Cancelling a booking frees its slot. The Firestore rules stop a slot being booked above its limit. Publish the updated `firestore.rules` and press **Save normal day** once on `/slots.html` to switch it on.


## Step-by-step booking & service prices
- The homepage booking card (`zh-book.js`) walks the customer through: **service → choices → price → time slot → details → booking ID + tracking link**.
  - **Mobile repair:** brand → model (search) → issue → sub-issue / question → repair option with price, MRP and warranty (from `zipphive-catalog.json` + Admin price list overrides). "Other brand / my model isn't listed" and "Other / not sure" let the customer type the model and problem; booked as Home diagnosis.
  - **Home Cleaning (featured):** sofa, bathroom, kitchen, rooms, mattress, carpet, windows, appliances, festive combo – each with its own price for **30 / 45 / 60 min**; the slot shown matches the length.
  - **AC Repair, Service & Installation** (install/uninstall merged in) and **AC AMC Plans:** Split / Window AC prices per item, quantity per AC, Family Pack minimum 2 ACs.
  - **Washing Machine, Plumber & Electrician** (one service, three tabs): every sub-issue has its own price and quantity; "Other issue" adds an inspection visit with the customer's description.
- **/pricing.html** (admin edits, store managers view): every item's name, description and price(s), show/hide, add/delete items, "other" visit charge. Saved to Firestore `content/services` (already writable by the admin under the current rules). Phone prices stay in Admin → Price list.
- Defaults live in `zh-services.js`; the homepage service cards and AMC plan prices read the same price list.

## Gmail alert for every new booking
- `apps-script/bookings-sync.gs` emails ALERT_EMAIL (zipphive@gmail.com) for each new booking or warranty job: service, selection, price, slot, customer, mobile, area, notes, with buttons for the dashboard, WhatsApp and tracking page.
- Sent within seconds (the website pings the script on every booking) or at the latest at the 5-minute sync. The first run only records existing bookings, so old orders are not emailed. Run `testBookingEmail` once from the editor to see a sample.

## MRP & discount
- Every price on /pricing.html has an **MRP** and a **Price**; the **% off** is calculated automatically ((MRP − Price) ÷ MRP). "Quick fill" sets all MRPs of a service to price + X% (rounded to …49/…99); "Clear all MRPs" removes them.
- The booking flow, homepage AMC cards and phone repair options show the MRP struck through with an "X% OFF" tag, and the summary shows "You save ₹…". Leave MRP empty to show only the price.
- A "💰 Service prices" button on /admin.html opens the same page.

## Patna-only bookings
- The booking flow's details step asks for a **pincode** (or "📍 Use my location"). Bookings are accepted only for Patna: pincodes starting 800 plus nearby 801103/801104/801105/801503/801505/801506, or a GPS location within 22 km of Patna centre. Outside → the booking button is disabled and the customer can ask to be notified on WhatsApp.
- The pincode is saved with the area; a shared location adds a Google Maps link to the booking notes for the technician.
- To add a city later, edit `SERVICE_AREA` at the top of `zh-book.js`.

## Oppo, Vivo, Xiaomi (Redmi/POCO) & Realme
- 68 models launched above ₹15,000 were added to `zipphive-catalog.json` (brands 7–10, SKU codes `Z9xxxxx`), using the OnePlus Nord 4 repair structure with prices scaled by price band (₹15–20k, ₹20–30k, ₹30–45k, ₹45–75k, ₹75k+). Flagships have no "Display Compatible" option.
- Prices are illustrative – edit them in Admin → 📱 Phone prices. `tools/add_brands.py` is the script that generated them.

## Home Cleaning landing page (`/cleaning.html`)
Photo-first page for the cleaning service: hero photo collage, trust strip, a grid of photo cards (one per cleaning item, with live "from ₹" price and % off), book-by-the-clock cards for 30 / 45 / 60 min, what's included, why ZippHive, how it works, the booking flow (opens straight at Home Cleaning via `data-start="cleaning"`), service areas and FAQ.
- Prices, % off and which items show all come from **Admin → 💰 Service prices** – nothing to edit in the HTML.
- Each cleaning item has a default ZippHive illustration. To use your own team's photo, paste its https link in the **Photo URL** box under the item in Service prices and save.
- Tapping a photo card opens the booking flow on that item (`data-book="cleaning" data-book-item="sofa"`, optional `data-book-dur="45"`).
- The booking flow's Home Cleaning step on the homepage uses the same photo cards.
- If a photo can't load, the card falls back to a coloured tile with an emoji, so nothing looks broken.

### Own photos (`zh-img/`)
Website photos should show ZippHive technicians in the teal polo with the yellow hexagon logo and yellow gloves (see `ZippHive_Photo_Prompts.md` in the Claude project for the image-generation prompts).
- `zh-img/clean-living-room.jpg`: cleaner wiping a table (cut from the cleaning poster). Used for "Bedroom / living room", the cleaning hero and how-it-works.
- `zh-img/cleaning-poster.jpg`: full poster, used as the WhatsApp/social share image for /cleaning.html.
- To add another: save as `zh-img/clean-<item id>.jpg` and point that item to it in `CLEAN_IMG` in `zh-services.js` (or paste the URL in Admin → Service prices → Photo URL). Items without a real photo use ZippHive-themed illustrations (`zh-img/clean-*.svg`, teal/yellow, yellow-gloved hand with the Z sleeve logo) generated by `tools/clean_illustrations.py` – no stock photos are used any more.

### Service illustrations (`zh-img/svc/`)
Every service has ZippHive-themed pictures (teal/yellow, hexagon pattern, yellow-gloved hand with the Z sleeve logo, a yellow hex badge showing the job – drop for leaks, bolt for power, + for installation, etc.):
- AC repair & installation (`ac-*.svg`), Split / Window AC choice, AMC plans (`amc-*.svg`)
- Washing machine (`wm-*`), plumber (`pl-*`), electrician (`el-*`) jobs – shown as thumbnails in the booking rows
- Phone repair problems (`ph-<issue id>.svg`, ids from `zipphive-catalog.json`) – shown on the "What's wrong with your phone?" step
- Service covers on the homepage cards and the first booking step
Regenerate with `python3 tools/service_illustrations.py zh-img`. New admin-added items fall back to their category picture; paste a Photo URL in Admin → Service prices to use your own picture for any item.

## AI Assistant – service knowledge & diagnosis (`zh-assistant-kb.js`)
The chat assistant now answers more than prices, in **English, हिंदी and Hinglish** (it replies in the language the customer writes in):
- **Process / technician steps** – "AC gas refill kaise hota hai?", "what does the technician do in sofa cleaning?"
- **Time required** – "AC installation me kitna time lagta hai?", "how long does a battery replacement take?"
- **Diagnosis** – yes/no troubleshooting with safe self-checks and the likely fault, then the right service + live price + "Book a slot": AC not cooling, AC water leak, washing machine, phone not charging / battery / not turning on / water damage, MCB tripping, fan slow, drain blocked, geyser not heating. Safety advice comes first (swollen battery, sparks, water-damaged phone).
- General: technician verification, how ZippHive works, which services we offer.
Phone model + problem (e.g. "iPhone 13 screen broken") still goes to the instant price engine. All texts live in `zh-assistant-kb.js` (topics `T`, diagnosis flows `F`) – edit there to change times or wording.

## Serviceable area – pincodes & map (`/areas.html`, Admin → 🗺️ Service area)
The website no longer lists localities. Bookings are accepted by **pincode** (or GPS inside a map zone), managed by the admin:
- **Serviceable pincodes** – exact 6-digit pincodes (paste many at once).
- **Whole pincode ranges** – e.g. `800` serves every 800xxx pincode. Remove it to serve only the exact list.
- **Blocked pincodes** – never served, even inside a range.
- **Auto pincodes** – whenever a zone is added, moved, renamed or resized, the pincodes inside it are fetched automatically (from `zh-pincodes.json`, ~19k India Post pincodes with coordinates, loaded only on this admin page) and shown pre-ticked; one click adds them. Click anywhere on the map to see the nearest pincodes with “+ Add”.
- **Map zones** – circles (centre + radius km) used when a customer taps “📍 Use my location”. Search any place or pincode (“Delhi”, “Saket”, “110017”) and add it as a zone or move a zone there; typing a place name in a zone row moves it automatically (📍 Find re-runs it); “My current location” adds a zone where you stand; drag the pin to fine-tune; slider for radius. Place search uses OpenStreetMap Nominatim (India only).
- **Test a pincode** box to check any pincode before publishing.
Saved to Firestore `content/serviceArea` (public read, admin write – existing rules). Used by the booking flow, the homepage/cleaning “Do we serve your area?” checker, the AI assistant (“800001 me aate ho?”) and the assistant's booking form (pincode field). Default until first save: all 800xxx + six nearby 801xxx pincodes + a 22 km zone around Patna (same as before). Shared code: `zh-area.js`.

## Store manager dashboard – tracking & date filters (`/manager.html`)
- **Right now** – live counters for all open jobs (new, need technician, waiting for accept, on the job, unpaid).
- **Period** – Today · Yesterday · Last 7 days · Last 30 days · This month · Last month · All time · **Custom** (from/to dates). Choice is remembered on this device.
- **Filter list by** booking date, service (slot) date or completed date.
- Period KPIs: bookings received, completed, cancelled, collected ₹ (by payment mode), average bill, completion rate – with ▲▼ vs the previous period of the same length. **📊 Report**: bookings by service, technician performance, payments by mode.
- **Table** view (sortable columns; click a row to open the full job card with all actions) or **Cards** view. A banner warns when open jobs fall outside the chosen dates. Search always looks across all dates.
- **⬇ Export** downloads the filtered list as a CSV that opens in Excel / Google Sheets.

## Technician assignment window
Store managers can send a job to a technician only from **3 hours before the booked slot** (`ASSIGN_WINDOW_H` in `zh-ops.js`). Before that the job card shows 🔒 “Technician can be assigned from …” with a countdown, the booking is left out of “Needs action”, and the “Need a technician” box shows “+N scheduled later”. It unlocks by itself (the dashboard refreshes every 30 s). Bookings without a slot (“as soon as possible”) can be assigned any time. Confirming the booking / sending the WhatsApp confirmation is still allowed any time.

## No city names on the website
Customer-facing pages, the AI assistant, WhatsApp messages, tracking page, invoices and the technician app no longer mention a city/state. The service area is decided only by pincode / map zones (Admin → Service area). The optional “City name shown to customers” on that page is blank by default.
