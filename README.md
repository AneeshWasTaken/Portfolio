# Aneesh Rawat: Video Editor Portfolio

A fast, dark, minimal portfolio site. Plain HTML, CSS and JavaScript with **no dependencies and no build step**, so there is nothing to install and very little that can break.

```
index.html          the page (hero, about, services, contact, footer)
content/projects.json   <- YOUR PORTFOLIO LIVES HERE
assets/thumbs/      thumbnails you add
assets/previews/    short hover-preview clips you add (optional)
assets/videos/      small video files you add (optional)
css/styles.css      colours and styling (change them at the top)
js/main.js          behaviour (gallery, filters, player, form)
api/contact.js      the inquiry form's server code (keeps your keys secret)
404.html            custom "page not found" page
scripts/            helper tools (dev server, add-project, checks)
```

---

## 1. Preview it on your computer

1. Install [Node.js](https://nodejs.org) (version 18 or newer).
2. Open a terminal in this folder and run:

```
npm run dev
```

3. Open **http://localhost:3000**.

Do not double-click `index.html`. Browsers block loading `projects.json` that way, and the page will tell you so.

---

## 2. Update your portfolio (no redesign needed)

All your work is listed in **`content/projects.json`**. The gallery, filters and video player are built from it automatically.

### Easiest: the guided helper

```
npm run add-project
```

It asks for the title, category, description, software, video link, thumbnail and so on, then adds the project at the top. Preview with `npm run dev`.

### Or edit the file by hand

A project looks like this:

```json
{
  "id": "my-first-reel",
  "title": "Travel Reel: Manali",
  "category": "reels",
  "description": "Fast cuts, captions and beat-synced transitions.",
  "software": ["CapCut Mobile"],
  "aspect": "9:16",
  "thumbnail": "assets/thumbs/manali.jpg",
  "preview": "assets/previews/manali.mp4",
  "video": "https://www.youtube.com/watch?v=XXXXXXXXXXX"
}
```

| Field | What it does |
|---|---|
| `id` | Unique name: lowercase letters, numbers, dashes. |
| `title`, `description` | Shown on the card. |
| `category` | One of the ids at the top of the file: `reels`, `cinematic`, `gaming`, `motion`, `other`. You can rename or add categories there too. |
| `software` | Optional list of badges. Use `[]` for none. |
| `aspect` | `"16:9"` (landscape, default) or `"9:16"` (vertical). Sets the player shape. |
| `thumbnail` | Optional image path. Use a 16:9 image around 1280x720. For YouTube links it is fetched automatically if left empty. |
| `preview` | Optional short, muted loop that plays when someone hovers the card. Keep it under about 3 MB (5 to 8 seconds, around 640 px wide). |
| `video` | What opens when the card is clicked (see below). |

**To remove a project:** delete its whole `{ ... }` block (mind the commas). **To replace a thumbnail:** put the new image in `assets/thumbs/` and change the `thumbnail` path. Use a new file name so visitors do not see a cached old one. **Order:** top of the list is shown first.

**Placeholders:** the 6 starter cards have `"placeholder": true` and show a "Placeholder" badge. Delete them once you have your own work.

### What can go in `video`

- **YouTube** (best choice, including Shorts and Unlisted videos): paste the normal link.
- **Vimeo**: `https://vimeo.com/123456789`
- **Google Drive**: a share link with "Anyone with the link can view".
- **A video file** in `assets/videos/` (use H.264 `.mp4` for the widest support). Keep files small. Big videos are much better on YouTube or Vimeo.
- **Any other link** (Instagram, etc.): the card opens a window with a "Watch on ..." button.

Videos are never loaded until someone clicks a card, and hover previews load only on hover, so the page stays fast.

### Check your work

```
npm run check
```

This catches typos, missing files, wrong category names and duplicate ids.

### Publishing an update

Once the site is deployed (section 4), updating is: change `projects.json` and add your images, then push to GitHub. Vercel rebuilds and publishes automatically in about a minute. You can even do it from github.com in the browser: open the file, click the pencil icon, edit, and commit. There is no admin password to protect and nothing to hack.

> **Why not an admin dashboard?** A real one needs a database and secure logins, which adds cost and risk for a one-person portfolio. A file you control on GitHub is safer and simpler. If you later want a point-and-click editor, a Git-based CMS such as Decap CMS can be added on top of this same `projects.json`.

---

## 3. Make the inquiry form work

The form sends through a small server function (`api/contact.js`) so your API key is never in the page's code. Until you set it up, the form **tells visitors it is not connected and that nothing was sent**. It never fakes success.

Setup uses [Resend](https://resend.com) (free tier available):

1. Create a Resend account and make an **API key**.
2. In Vercel: **Project -> Settings -> Environment Variables**, add:
   - `RESEND_API_KEY` = your key
   - `CONTACT_TO_EMAIL` = the inbox that should receive inquiries (use the email you signed up to Resend with)
3. **Redeploy** (Deployments -> three dots -> Redeploy).
4. Send yourself a test inquiry from the live site.

By default emails are sent from Resend's test address (`onboarding@resend.dev`). As far as I know, Resend only allows that sender to deliver to your own account email, which is exactly this use. If you later want a custom sender, verify a domain in Resend and set `RESEND_FROM`. Check Resend's current docs for their latest limits.

For local testing, copy `.env.example` to `.env`, fill it in, and run `npm run dev`. Never commit `.env`; it is already in `.gitignore`.

The form has a hidden spam trap, validates input on both the browser and server side, and always has the email, Discord and WhatsApp buttons as a fallback.

---

## 4. Put it online (free, about 10 minutes)

1. Create a free account at [github.com](https://github.com) and make a new repository.
2. Upload everything in this folder to it (drag and drop works on the GitHub website, or use `git push`).
3. Create a free account at [vercel.com](https://vercel.com), click **Add New -> Project**, and import your repository.
4. Leave all settings as they are (no build command needed) and click **Deploy**.
5. You get a live address like `your-project.vercel.app`. Add a custom domain later under **Settings -> Domains** if you want one.
6. Set up the contact form (section 3).
7. Tell the site its real address, so link previews (WhatsApp, Discord, Google) look right. Run this locally, then push:

```
npm run set-domain https://your-real-address.com
```

No Git? You can also run `npx vercel` in this folder and follow the prompts.

> The contact form needs a host that runs server functions (Vercel does). On a plain static host (for example GitHub Pages) the site works, but the form will show an honest error and visitors will use email, Discord or WhatsApp instead.

---

## 5. Edit text, colours and details

- **Words** (hero, about, services, contact details, footer): open `index.html` and edit the text.
- **Colours and fonts**: the variables at the top of `css/styles.css` (`--accent` is the lime green).
- **Software list**: the "Software I use" list in `index.html`. It currently reads "After Motion Z" exactly as you wrote it. If you meant a different app name (for example Alight Motion), correct it there.

---

## 6. Tests

```
npm test
```

Checks `projects.json` and tests the contact function with a fake email provider (nothing is really sent).

## Accessibility and performance

Semantic HTML, a skip link, visible keyboard focus, labelled form fields, a keyboard-friendly video dialog, `prefers-reduced-motion` support (animations and hover previews switch off), lazy-loaded images, videos and embeds loaded only on demand, no JavaScript libraries.
