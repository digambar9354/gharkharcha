# GharKharcha — घर खर्चा
### Family Expense Tracker · Phase 1

---

## Files in this project

```
gharKharcha/
├── index.html      ← Main app (all views)
├── style.css       ← All styles
├── app.js          ← All logic (expenses, charts, login)
├── manifest.json   ← PWA (add to home screen)
└── README.md       ← This file
```

---

## Step 1 — Test locally

1. Download all 4 files into one folder called `gharKharcha`
2. Open `index.html` in Chrome or Safari
3. Click "Sign in with Google" to test login
4. Your Client ID is already set: `56285835763-s5mk752qj0smuc01hr10k5nu7ii46n1c.apps.googleusercontent.com`

> ⚠️ Google login only works on localhost or a live https:// URL.
> Open via `http://localhost` not by double-clicking the file.

To run on localhost, use VS Code Live Server or:
```bash
python3 -m http.server 3000
# then open http://localhost:3000
```

---

## Step 2 — Push to GitHub

1. Go to github.com → New repository
2. Name: `gharKharcha` (can be Private)
3. Upload all 4 files
4. Click Commit

---

## Step 3 — Deploy on AWS Amplify

1. Go to AWS Console → Amplify
2. Click "New app" → "Host web app"
3. Connect GitHub → select `gharKharcha` repo
4. Branch: `main`
5. Click "Save and deploy"
6. In ~2 minutes your site is live at:
   `https://main.XXXXXXXX.amplifyapp.com`

---

## Step 4 — Update Google OAuth for live URL

1. Go to Google Cloud Console → APIs & Services → Credentials
2. Click your OAuth Client ID
3. Under "Authorized JavaScript origins" add your Amplify URL:
   `https://main.XXXXXXXX.amplifyapp.com`
4. Save — Google login now works on the live site

---

## Step 5 — Share with family

Send this message to family members:
```
GharKharcha app is live!
Link: https://main.XXXXXXXX.amplifyapp.com

On Android: open link → tap ⋮ menu → "Add to Home Screen"
On iPhone: open in Safari → tap Share → "Add to Home Screen"
It will look like an app icon on your phone!
```

---

## What works in Phase 1 (this version)

- ✅ Google Login (OAuth)
- ✅ Dashboard with metrics & charts
- ✅ Add expenses manually
- ✅ Receipt scan (simulated OCR — see Phase 2)
- ✅ Expense filtering (All / Shared / Personal)
- ✅ Monthly reports & charts
- ✅ Family members view
- ✅ Works on mobile (PWA — add to home screen)
- ✅ Data saved locally (localStorage)

---

## Phase 2 (coming next)

- [ ] Real Google Cloud Vision OCR
- [ ] AWS DynamoDB (cloud database, shared across family)
- [ ] Google Sheets auto-backup
- [ ] Google Photos receipt storage
- [ ] WhatsApp chat import (Marathi/English)
- [ ] Push notifications

---

## Your Client ID
```
56285835763-s5mk752qj0smuc01hr10k5nu7ii46n1c.apps.googleusercontent.com
```
Keep this safe. Do not share publicly.

---

Built with: HTML · CSS · JavaScript · Chart.js · Google OAuth
Cost: ₹0/month
