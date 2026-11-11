# 🚀 AgriEasy.com - Vercel Deployment Guide

## ✅ Project Status
- **Build**: ✓ All 23 routes compiled successfully
- **Tests**: ✓ All ESLint checks passed
- **TypeScript**: ✓ All type errors fixed
- **Ready for Production**: YES

---

## 📋 Pre-Deployment Checklist

### Step 1: Create GitHub Repository
1. Go to https://github.com/new
2. Repository name: `agrieasy` (or your preferred name)
3. Description: "AgriEasy.com - Agricultural Trading Platform"
4. Choose **Public** or **Private**
5. Click **Create repository**

### Step 2: Push Code to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/agrieasy.git
git branch -M main
git push -u origin main
```

Replace `YOUR_USERNAME` with your GitHub username.

---

## 🔑 Environment Variables Setup

Before deploying to Vercel, you need:

### 1️⃣ MongoDB Atlas Setup (Free)
1. Go to https://cloud.mongodb.com
2. Sign up or log in
3. Create a new project
4. Create a free M0 cluster
5. Add your IP to IP Whitelist (Allow access from anywhere: 0.0.0.0/0)
6. Create database user with password
7. Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/agrieasy?retryWrites=true&w=majority`

**Environment Variable:**
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/agrieasy?retryWrites=true&w=majority
```

### 2️⃣ Razorpay API Keys (Free Test Mode)
1. Go to https://razorpay.com
2. Sign up or log in
3. Go to Settings → API Keys
4. Copy **Key ID** (Test mode)
5. Copy **Key Secret** (Test mode)

**Environment Variables:**
```
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxx
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
```

### 3️⃣ JWT Secret
Generate a random secure string:
```bash
# Windows PowerShell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((1..32 | ForEach-Object { [char][byte]::new((0..255 | Get-Random)) } | Join-String))) | Out-String
```

Or use: `your-super-secret-jwt-key-change-this-in-production`

**Environment Variable:**
```
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 3b️⃣ Media Storage — Cloudflare R2 (recommended) or Cloudinary (legacy)

The app supports two media storage backends. **R2 is recommended** —
it's S3-compatible with **$0 egress** (free bandwidth forever), which
matters hugely for a social app serving photos + videos. At 10K
video uploads/month, R2 saves ~$70-150/mo vs Cloudinary or Vercel Blob.

If R2 env vars are set → new uploads go to R2.
If only Cloudinary env vars are set → new uploads go to Cloudinary.
Existing assets (whichever backend they're on) keep serving — both
are just URL strings stored in MongoDB.

#### Option A — Cloudflare R2 (recommended)

1. **Create a bucket**: https://dash.cloudflare.com → R2 Object Storage
   → Create bucket → name it `agrieasy-media` → Create.
2. **Enable public access**: bucket → Settings → Public access →
   either connect a custom domain (e.g. `media.agrieasy.site`, requires
   the domain on Cloudflare DNS) OR enable the `r2.dev` subdomain
   (free, but rate-limited and not CDN-cached — fine for dev, use a
   custom domain for production).
3. **Create API tokens**: bucket → Manage R2 API Tokens → Create API
   token → Object Read & Write → scope to the bucket. Copy the
   **Access Key ID**, **Secret Access Key**, and note your
   **Account ID** (top-right of the Cloudflare dashboard).
4. **Set these 5 env vars in Vercel** (Settings → Environment Variables,
   Production):

```
R2_ACCOUNT_ID=your-cloudflare-account-id
R2_ACCESS_KEY_ID=the-access-key-id
R2_SECRET_ACCESS_KEY=the-secret-access-key
R2_BUCKET_NAME=agrieasy-media
R2_PUBLIC_URL=https://media.agrieasy.site
```

5. **Redeploy** (Deployments → ⋯ → Redeploy → uncheck build cache).

#### Option B — Cloudinary (legacy, already configured)

If you already have Cloudinary env vars set, they keep working as the
fallback when R2_* vars are not set. No action needed.

```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```


### 4️⃣ Google Sign-In (OAuth) — Setup From Scratch

> **Do this if you see `Error 401: deleted_client`, `Error 400: redirect_uri_mismatch`,
> or "Access blocked" on the Google sign-in page.** Follow top to bottom; do not skip.

#### Part A — Delete the old/broken credentials (5 min)

1. Go to https://console.cloud.google.com/apis/credentials
2. Use the **project selector at the TOP-LEFT** — OAuth clients live inside a
   specific project. If you have several projects, repeat Part A in each one
   that shows credentials.
3. Under **OAuth 2.0 Client IDs**: click every old client → **Delete** → confirm.
   (Deleting is safe — "Continue with Google" is currently broken anyway.)
4. **API keys are NOT used for sign-in.** If you see an API key row
   (`AIzaSy...`) you no longer need, delete it too — especially if it was ever
   shared in a chat/screenshot (it must be treated as leaked).
5. Done when the Credentials page is empty.

#### Part B — OAuth consent screen (5 min)

1. Left sidebar → **OAuth consent screen** (Google Auth Platform)
2. User type: **External** → **Create**
3. App name: `AgriEasy` · User support email: your Gmail · Developer contact: your Gmail
4. **Scopes** step → Add: `email`, `profile`, `openid`
5. **Test users** step → add your Gmail (+ teammates)
6. Save → back to the dashboard → click **Publish App** (with only
   email/profile/openid scopes this is instant and lets ANY user sign in;
   while in "Testing" only your listed test users can sign in).

#### Part C — Create the OAuth client ID (5 min)

1. **Credentials → Create Credentials → OAuth client ID**
2. Application type: **Web application** ← must be exactly this
3. Name: `AgriEasy Web`
4. **Authorized JavaScript origins** — add:
   ```
   https://agrieasy.site
   http://localhost:3100
   ```
5. **Authorized redirect URIs** — add EXACTLY (no trailing slashes):
   ```
   https://agrieasy.site/api/auth/callback/google
   https://agrieasy-com1.vercel.app/api/auth/callback/google
   http://localhost:3100/api/auth/callback/google
   ```
6. **Create** → a dialog shows the new **Client ID**
   (`…apps.googleusercontent.com`) and **Client secret** (`GOCSPX-…`).
   Copy BOTH now — the secret is shown only once unless you download the JSON.

#### Part D — Put them in Vercel and REDEPLOY (2 min)

1. Vercel → project → Settings → Environment Variables
2. **Edit** the existing rows (don't create duplicates):
   - `GOOGLE_CLIENT_ID` → new Client ID
   - `GOOGLE_CLIENT_SECRET` → new Client secret
3. Confirm these two exist and are correct:
   - `NEXTAUTH_URL` = `https://agrieasy.site`
   - `NEXTAUTH_SECRET` = any long random string (JWT_SECRET works)
4. Every row must have the **Production** environment ticked.
5. **Deployments tab → ⋯ on the latest deployment → Redeploy → UNCHECK
   "Use existing Build Cache" → Redeploy.**
   ⚠️ Saving env vars does NOTHING to the running deployment until you
   redeploy — this is the #1 reason changes "don't take effect".

#### Part E — Verify (1 min)

1. Open `https://agrieasy.site/api/auth/oauth-check`
   - `clientId` must show the NEW client ID (not the old deleted one)
   - `status` must be `"PASS"`
   - If FAIL: read `message` + `fix[]` in the response and follow them.
2. Then test the real flow: `/auth/login` → **Continue with Google**.
3. First-time Google users are sent to `/auth/register?google=1` once to
   pick a role + phone, then auto-registered and signed in.

---

## 🚀 Deploy to Vercel

### Step 1: Import Repository to Vercel
1. Go to https://vercel.com/new
2. Click **Continue with GitHub**
3. Authorize Vercel to access your GitHub
4. Select **agrieasy** repository
5. Click **Import**

### Step 2: Configure Environment Variables
In Vercel dashboard, under "Environment Variables", add:

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | Your MongoDB connection string |
| `JWT_SECRET` | Your secure random string |
| `RAZORPAY_KEY_ID` | Your Razorpay Key ID |
| `RAZORPAY_KEY_SECRET` | Your Razorpay Secret |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Your Razorpay Key ID |
| `NEXTAUTH_URL` | `https://agrieasy.site` (your production domain) |
| `NEXTAUTH_SECRET` | Any secure random string (can be same as JWT_SECRET) |
| `GOOGLE_CLIENT_ID` | From Google Cloud Console (see below) |
| `GOOGLE_CLIENT_SECRET` | From Google Cloud Console (see below) |

### Google Sign-In Setup (OAuth) — REQUIRED for "Continue with Google"

> **Error 400: redirect_uri_mismatch?** This means the URLs below are
> missing from your Google OAuth client. This is the #1 Google sign-in
> failure — follow these steps exactly.

1. Go to **https://console.cloud.google.com/apis/credentials**
2. Under **OAuth 2.0 Client IDs**, click your Web application client
   (or create one: **Create Credentials → OAuth client ID → Web application**)
3. Under **Authorized redirect URIs**, click **ADD URI** and add ALL of these:

   ```
   https://agrieasy.site/api/auth/callback/google
   https://agrieasy-com1.vercel.app/api/auth/callback/google
   http://localhost:3100/api/auth/callback/google
   ```

4. Under **Authorized JavaScript origins**, add:

   ```
   https://agrieasy.site
   http://localhost:3100
   ```

5. Click **Save** (changes apply within a few minutes)
6. Copy the **Client ID** and **Client secret** into your Vercel env
   vars (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`), then
   **redeploy** (Vercel → Deployments → ⋯ → Redeploy).

**How to verify what your app ACTUALLY sends — and whether Google accepts it:**

Visit **`https://agrieasy.site/api/auth/oauth-check`**. It performs the exact
same authorization request a real "Continue with Google" click performs and
reports:

- `clientId` — the client ID your deployment is really using. **The redirect
  URI must be registered on THIS client** (client IDs are the identity Google
  checks against — if you edited a different client, your change does nothing).
- `redirectUri` — the callback URL NextAuth sends.
- `status` — `PASS` (Google accepts it) or `FAIL` + a `fix[]` array with
  concrete steps.

> **Confirmed diagnosis (2026-11-10):** Google's own server rejected the
> sign-in with `redirect_uri_mismatch` for client ID
> `855905280291-3a9s97d4jcc28opoo7klilfcvvplutfg` even though the console
> "looked configured". The 4 traps that cause this, in order of likelihood:
> 1. **Wrong OAuth client** — the URI was added to a *different* client (or a
>    *different GCP project* — check the project selector at the top of the
>    console!) than the one whose ID is in `GOOGLE_CLIENT_ID`.
> 2. **Env vars updated in Vercel but not redeployed** — env changes do NOT
>    apply to the running deployment until you click Redeploy.
> 3. **Wrong application type** — the client must be "Web application";
>    Desktop/iOS/Android clients ignore the Authorized redirect URI list.
> 4. **Typo in the saved URI** — trailing slash, `http` instead of `https`,
>    or `www.` prefix.
>
> `oauth-check` also shows the live client ID so you can compare it against
> the console — they must match character for character.

**Local dev:** sign-in with Google only works locally if
`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set in `.env.local`
and `NEXTAUTH_URL=http://localhost:3100` matches the port you run
`npm run dev` on.

### Step 3: Deploy
1. Click **Deploy**
2. Wait for build to complete (~2-3 minutes)
3. ✅ Your site is live!

**Deployment URL Format:**
```
https://agrieasy.vercel.app
```

---

## 🧪 Testing After Deployment

1. **Test Farmer Registration**: `/auth/register?role=farmer`
2. **Test Buyer Registration**: `/auth/register?role=buyer`
3. **Test Transporter Registration**: `/auth/register?role=transporter`
4. **Test Listing Creation**: Buyer dashboard → Create Listing
5. **Test Vehicle Booking**: Farmer dashboard → Search Buyers → Book Vehicle
6. **Test Payment**: Buyer dashboard → Billing → Pay (Razorpay Test Mode)

---

## 💰 Razorpay Test Cards (for testing payments)

**Credit Card:**
- Number: `4111 1111 1111 1111`
- Expiry: Any future date
- CVV: Any 3 digits

**Debit Card:**
- Number: `5555 5555 5555 4444`
- Expiry: Any future date
- CVV: Any 3 digits

---

## ⚡ Post-Deployment

### Custom Domain (Optional)
1. In Vercel dashboard → Settings → Domains
2. Add your custom domain
3. Update DNS settings at your domain provider

### Monitoring
- **Vercel Analytics**: Dashboard shows deployment status
- **Database Logs**: MongoDB Atlas Atlas → Collections
- **Payment Logs**: Razorpay Dashboard → Payments

### Production Razorpay Keys (When Ready)
1. In Razorpay dashboard, switch from **Test Mode** to **Live Mode**
2. Get production Key ID and Secret
3. Update environment variables in Vercel
4. Redeploy

---

## 🛠️ Troubleshooting

**Build fails on Vercel:**
- Check environment variables are set
- Ensure MONGODB_URI is correct
- Check MongoDB IP whitelist includes Vercel's IPs

**Payment not working:**
- Ensure NEXT_PUBLIC_RAZORPAY_KEY_ID is set (must be public)
- Test with Razorpay test cards
- Check browser console for errors

**Database connection errors:**
- Verify MONGODB_URI format
- Check MongoDB Atlas allows connections from Vercel
- Ensure cluster is running

---

## 📞 Support

For issues:
1. Check Vercel deployment logs: Dashboard → Deployments
2. Check browser console: F12 → Console tab
3. Check MongoDB Atlas logs
4. Verify environment variables are correctly set

---

## ✨ Congratulations!

Your AgriEasy.com platform is now live! 🎉

Features deployed:
- ✅ 3 User roles (Farmer, Buyer, Transporter)
- ✅ Complete authentication system
- ✅ Commodity listing creation
- ✅ Vehicle booking system
- ✅ Real-time tracking support
- ✅ Billing management
- ✅ Razorpay payments

Next steps:
- Invite testers
- Gather feedback
- Plan Phase 2 features (chat, ratings, weather API)
