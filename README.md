# Your Portfolio: The Series

A streaming-style portfolio website with a cinematic intro, a "Who's watching?" profile screen, and an **admin panel** that lets you change everything on the site without touching code.

- **Site:** `index.html` (reads all its text, photos and colours from `content.json`)
- **Admin panel:** `/admin` (edit, preview live, and publish)
- **No database, no server, free hosting.** The admin saves `content.json` to your GitHub repo, and your host redeploys automatically.

```
portfolio/
├── index.html          ← the website
├── content.json        ← ALL your content (the admin edits this)
├── assets/
│   ├── site.css        ← design
│   ├── site.js         ← animations, sound, rendering
│   ├── cursor.js       ← symbol trail that follows the mouse (desktop only)
│   └── cursor-icons/   ← optional logo files for the trail (see its README.txt)
├── images/             ← your uploaded photos go here
├── admin/
│   ├── index.html      ← admin panel
│   ├── admin.css
│   └── admin.js
└── README.md
```

---

## 1. Try it on your computer

The site loads `content.json`, so it needs a small local server. Double-clicking `index.html` won't work.

**Option A: VS Code (easiest)**
1. Open the `portfolio` folder in VS Code.
2. Install the **Live Server** extension.
3. Right-click `index.html` → **Open with Live Server**.
4. The admin panel is at `http://127.0.0.1:5500/admin/`.

**Option B: Terminal**
```bash
cd portfolio
npx serve .          # or:  python -m http.server 8000
```
Then open `http://localhost:3000` (or `:8000`), and `/admin/` for the admin panel.

Edits you make in the admin locally appear in the **preview** right away. To make them permanent before you deploy, click **Publish & backup → Download content.json** and replace the `content.json` file in the folder.

---

## 2. Put it on GitHub

1. Create a free account at <https://github.com> if you don't have one.
2. Click **New repository**. Name it `portfolio`, keep it **Public** (or Private; both work), then click **Create repository**.
3. On the new repo page, click **uploading an existing file**.
4. Drag in **everything inside** the `portfolio` folder (`index.html`, `content.json`, `assets`, `admin`, `images`, `README.md`), not the folder itself.
5. Click **Commit changes**.

---

## 3. Deploy (free)

### Vercel (recommended)
1. Go to <https://vercel.com>, then **Sign up with GitHub**.
2. Click **Add New → Project** and **Import** your `portfolio` repo.
3. Set **Framework Preset** to **Other**. Leave everything else empty.
4. Click **Deploy**. In about 30 seconds you get a link like `portfolio-yourname.vercel.app`.

### Netlify (alternative)
**Add new site → Import an existing project → GitHub →** pick the repo. Leave the build command empty and set the publish directory to `/`. Then deploy.

### GitHub Pages (alternative)
In your repo, go to **Settings → Pages → Source: Deploy from a branch → `main` / root → Save**. Your site will be at `yourname.github.io/portfolio`. Pages can take up to 10 minutes to show updates.

From now on, every change saved to the repo redeploys the site automatically.

---

## 4. Connect the admin panel (one time)

1. Open `https://YOUR-SITE/admin/`.
2. Go to **Publish & backup** in the sidebar.
3. Create a GitHub token:
   - On GitHub, open **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
   - Name it `portfolio-admin`. For expiration, pick 90 days or longer.
   - **Repository access:** Only select repositories → `portfolio`.
   - **Permissions → Repository permissions → Contents: Read and write.**
   - Click **Generate token** and copy it.
4. In the admin, fill in your **GitHub username**, the **repository name** (`portfolio`), the **branch** (`main`) and paste the **token**.
5. Click **Test connection**. You should see "Connected ✓".

---

## 5. Editing your site

| Admin page | What it changes |
|---|---|
| Profile & contact | Name, full name, initials, role, bio, **photo**, email, résumé/GitHub/LinkedIn/Instagram links |
| Billboard | The info line (98% Match, years, degree…), button labels, row title |
| Intro | Turn the intro on/off; the text under your name, Play/Skip labels |
| Who's watching | Title, note, and every profile (name, avatar, colours, **section order**) |
| Résumé | Education, experience, highlights, skills summary, big numbers, side card |
| Achievements | Gold award cards and certificates (with verify links) |
| Skills | Categories (tabs) and each skill with a 1–5 level |
| Projects | Project posters: name, description, tech stack, **screenshot**, icon, colours, demo & code links |
| About me | Quote (wrap a word in `*stars*` to make it red), photo, quick facts |
| Journey | Episodes with year, title, description, colours, progress bar |
| Top picks | Ranked cards (1–5), which section each one opens |
| Contact & footer | "To be continued…" text, button label, last line, footer |
| Section titles & cards | Every heading, menu name and episode card, and **hide any section** |
| Theme & SEO | Accent colour, gold colour, film grain, **cursor trail** (on/off, click burst, speed, circle size, spacing, max badges, colour A and B, and the symbol list: rename, reorder, hide, pick a symbol, or upload a logo), browser tab title, Google description |

**How it works:**
- Every change is saved automatically **in your browser** as a draft. The preview on the right shows it live (use the Desktop/Phone switch to check both).
- Lists have ↑ ↓ to reorder, ⧉ to duplicate and ✕ to delete.
- Upload photos by clicking **Upload image** or dragging a file onto the box. They're resized automatically.
- When you're happy, click **Publish**. New images go into `images/`, `content.json` is updated on GitHub, and the live site updates in about a minute.
- Press **Ctrl/Cmd + S** to save and refresh the preview.

**Tips:**
- **Photo:** a PNG with the background removed (e.g. using remove.bg) looks best against the red glow.
- **Text placeholders:** `{name}` and `{fullName}` are replaced in headings, the footer and the "Who's watching" note.
- **Links to send people:**
  - `yoursite.com/?profile=rec` opens straight into the Recruiter profile (after the intro).
  - `yoursite.com/?skip=1&profile=dev` skips the intro and opens the Developer profile.
  - `yoursite.com/?skip=1&at=originals` jumps straight to your projects.
  - `yoursite.com/?who=1` opens the "Who's watching?" screen.
  - `yoursite.com/?preview=1` shows the unpublished draft saved in this browser, with a PREVIEW badge. The admin preview uses this.

---

## 6. Backups

**Publish & backup → Download content.json** saves all your content in one file. **Import content.json** loads it back. Your full history is also in GitHub: every publish is a commit, so you can always go back.

---

## 7. Security, in plain words

- The admin page is public, but it **can't change anything without your token**, and the token is stored **only in your own browser**.
- Never share the token or commit it to the repo. If you think it leaked, delete it on GitHub (Settings → Developer settings → tokens) and create a new one.
- On a shared or public computer, click **Forget token** when you're done.
- The admin page tells search engines not to index it.

---

## 8. Custom domain (optional)

Buy a domain (e.g. from Namecheap, GoDaddy or Hostinger), then in **Vercel → Project → Settings → Domains** add it and follow the DNS steps shown there.

---

## FAQ

**I changed something but the live site didn't update.**
Wait 1–2 minutes, then hard-refresh (Ctrl+Shift+R). Check your host's dashboard to see whether the deploy finished.

**"Connection failed: Not found."**
Check the username, repo name and branch. If the repo is private, make sure the token was given access to it.

**"Browser storage is full."**
Your unpublished images are too big for the browser. Publish now (that moves the images to GitHub), or use smaller images.

**Can I edit content.json by hand?**
Yes. It's plain JSON. Edit it on GitHub or locally and the site updates the same way.
