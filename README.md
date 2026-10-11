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
