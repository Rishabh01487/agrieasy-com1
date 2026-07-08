# AgriEasy.com — India's Agricultural Marketplace + AgriSocial

A production-ready, full-stack web application connecting farmers directly with agricultural buyers, featuring Instagram-style social networking (AgriSocial), real-time vehicle booking, billing, integrated UPI payments, and a built-in wallet (AgriPay).

Built on **Next.js 16 + React 19 + TypeScript + MongoDB + Tailwind CSS 4**, with a unified **blue & white** brand identity across all modules.

---

## ✨ Features

### 📱 AgriSocial —  community for farmers, buyers & transporters
- **Stories** — 24h auto-expiring stories with full-screen viewer (progress bars, tap zones, pause-on-hold, like & share-to-DM)
- **Ranked feed** — 3 modes: Following (60% ranked + 40% latest, interleaved), 🔥 Top (pure ranked), ⏱ Latest (chronological). Rank score auto-computed from likes × 5 + comments × 8 + saves × 6 + shares × 10 + recency decay
- **Double-tap to like** with heart-burst animation
- **Carousel posts** — up to 10 images per post with dots + arrows + counter
- **Hashtags** — auto-extracted from caption, clickable everywhere, dedicated hashtag search & explore filtering
- **Direct Messages** — two-pane Instagram layout, optimistic send, 5s polling, read-receipts, link-share from posts
- **Notifications** — activity feed grouped by day (Today / Yesterday / This Week / Earlier), like / comment / follow / mention / message types, unread badges, auto-mark-read
- **Saved posts** — bookmark any post, view in a private 3×3 grid
- **Suggested users** — ranked by mutual-follower count + posting activity
- **Search** — debounced search across users (farmerName / firmName / phone) and hashtags
- **Share** — copy-link + share-to-DM with share-count tracking
- **KrishiClips** — Instagram Reels-style vertical video feed with scroll-snap, auto-play on visibility
- **Profiles** — story-ring avatar, Follow / Message buttons, stats (posts / followers / following), bio, highlights placeholder, Posts / Clips / Saved tabs
- **Post detail** — 2-column Instagram layout with threaded comments + reply-to
- **Create post** — camera capture, gallery upload, 8 filters, brightness/contrast adjustments, hashtag auto-extraction, category selection

### 🌾 Farmer Portal
- Authentication (phone + password, optional OTP)
- Aadhar-based verification (encrypted at rest)
- Browse buyer demand with commodity / price filtering + sort bar (Highest price / Lowest price / Largest qty / Most recent)
- Redesigned dashboard with stat cards, quick actions, "Today's Market" sidebar ranking top-priced commodities
- Book transportation vehicles for delivery
- Track bookings & vehicle status
- Receive payments via AgriPay wallet or UPI

### 🏢 Buyer Portal
- Authentication + business profile with GSTIN
- Create commodity demand listings (Wheat, Rice, Maize, Barley, Paddy, Oilseeds, Pulses, Vegetables, etc.)
- Redesigned dashboard with stat cards, quick actions, color-coded commodity chips, card-based listings (no more raw tables)
- Manage and edit listings
- Create billing & invoices
- Pay farmers via AgriPay wallet or UPI

### 🚚 Transporter Portal
- Register vehicles (trucks, tempos, tractors, pickups, containers, tankers)
- List vehicles with capacity and pricing
- Manage vehicle availability
- Track active bookings

### 💳 AgriPay Wallet
- Razorpay integration for UPI top-ups (test mode supported)
- P2P transfers between AgriEasy users
- Bill payments
- PayLater (credit facility with 9.9% p.a. interest, 30-day repayment)
- Transaction history
- QR scan-to-pay

### 🔒 Security & Production Hardening
- **JWT auth** with httpOnly cookie + Bearer token (dual-mode)
- **Password hashing** via bcryptjs
- **Field-level encryption** for Aadhaar, driving license, bank details (AES-256-GCM)
- **Input validation** on every API route via Zod schemas
- **XSS protection** via `xss` library (strips all HTML from user input)
- **Rate limiting** per-user (configurable per route, Redis-backed when available)
- **Security headers** — HSTS, X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy, Permissions-Policy
- **CORS** configurable via `CORS_ORIGINS` env var
- **Audit logging** for all sensitive actions (post/like/comment/follow/payment/transfer)
- **MongoDB injection protection** via Mongoose + Zod validation
- **Request ID** tracking on every request for debugging

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | **Next.js 16** (App Router, Turbopack, React 19) |
| Language | **TypeScript 5** (strict) |
| Database | **MongoDB** (Atlas or self-hosted) via **Mongoose 9** |
| Auth | **JWT** + bcryptjs + optional NextAuth (Google OAuth) |
| Payments | **Razorpay** (UPI, cards, wallets, PayLater) |
| Media | **Cloudinary** (signed uploads for posts, stories, profile pics) |
| Cache | **Upstash Redis** (optional — for caching & distributed rate-limiting) |
| SMS/OTP | **Twilio** or **Fast2SMS** (optional — phone OTP login) |
| Styling | **Tailwind CSS 4** + inline-style design system (`lib/styles.ts`) |
| Validation | **Zod 4** for all API request bodies |
| Logging | **Pino** (structured JSON logs) |
| Rate Limiting | Redis-backed (with in-memory fallback for dev) |

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 18+** (Node 20 LTS recommended)
- **npm 10+**
- **MongoDB** — free Atlas cluster at [cloud.mongodb.com](https://cloud.mongodb.com)
- **Razorpay account** — free test mode at [razorpay.com](https://razorpay.com)
- **Cloudinary account** — free tier at [cloudinary.com](https://cloudinary.com) (for media uploads)

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/Rishabh01487/agrieasy-com1.git
cd agrieasy-com1

# 2. Install dependencies
npm install

# 3. Copy the env template and fill in your values
cp .env.example .env.local
# Edit .env.local with your MongoDB URI, JWT secret, encryption key, etc.

# 4. Run the dev server
npm run dev

# 5. Open http://localhost:3000
```

### Generating secrets

```bash
# JWT_SECRET (must be ≥32 chars)
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"

# ENCRYPTION_KEY (must be exactly 64 hex chars = 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 📦 Deployment (Vercel — recommended)

The app is configured for zero-config Vercel deployment.

1. **Push to GitHub** (already done if you're reading this on GitHub)
2. Go to [vercel.com/new](https://vercel.com/new) → "Continue with GitHub" → select this repo
3. **Add environment variables** (copy from `.env.example`):
   - `MONGODB_URI` — your Atlas connection string
   - `JWT_SECRET` — 32+ char random string
   - `ENCRYPTION_KEY` — 64 hex chars
   - `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET` + `NEXT_PUBLIC_RAZORPAY_KEY_ID`
   - `CLOUDINARY_CLOUD_NAME` + `CLOUDINARY_API_KEY` + `CLOUDINARY_API_SECRET` (for media uploads)
   - `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` (optional, recommended for prod)
4. Click **Deploy** — Vercel auto-detects Next.js, runs `npm run build`, and goes live
5. Your app is at `https://agrieasy-com1.vercel.app` (or your custom domain)

### Other platforms
The app runs anywhere Node.js runs: **Netlify**, **Railway**, **Render**, **DigitalOcean App Platform**, or a VPS with `npm run build && npm start`. Just set the env vars and expose port 3000.

---

## 🧪 Test Accounts & Demo Data

After deploying, register test accounts:

| Role | URL | What to test |
|------|-----|-------------|
| **Farmer** | `/auth/register?role=farmer` | Register → Search buyers → Book vehicle → Post on AgriSocial |
| **Buyer** | `/auth/register?role=buyer` | Register → Create listing → Pay via AgriPay → Browse AgriSocial |
| **Transporter** | `/auth/register?role=transporter` | Register → Add vehicle → Accept bookings |

### Test payment (Razorpay test mode)
- Card: `4111 1111 1111 1111`
- Expiry: any future date
- CVV: any 3 digits
- UPI: `success@razorpay`

---

## 📁 Project Structure

```
agrieasy-com1/
├── app/
│   ├── agrisocial/              # 📱 Instagram-style social network
│   │   ├── page.tsx             #   Feed (stories + ranked feed + double-tap)
│   │   ├── stories/[userId]/    #   Full-screen story viewer
│   │   ├── clips/               #   Reels-style vertical video feed
│   │   ├── explore/             #   Trending posts grid + hashtag filter
│   │   ├── create/              #   Camera + upload + filters + carousel
│   │   ├── profile/[userId]/    #   Profile with highlights + tabs
│   │   ├── post/[postId]/       #   Post detail with threaded comments
│   │   ├── dm/                  #   Direct messages (two-pane)
│   │   ├── notifications/       #   Activity feed
│   │   ├── search/              #   Users + hashtags search
│   │   └── saved/               #   Saved posts grid
│   ├── farmer/                  # 🌾 Farmer portal
│   ├── buyer/                   # 🏢 Buyer portal
│   ├── transporter/             # 🚚 Transporter portal
│   ├── agripay/                 # 💳 Wallet + payments
│   ├── admin/                   # ⚙️ Admin dashboard
│   ├── auth/                    # 🔐 Login + register
│   └── api/
│       ├── social/              # AgriSocial API (15+ routes)
│       ├── listings/            # Buyer demand listings
│       ├── bookings/            # Vehicle bookings
│       ├── vehicles/            # Transporter fleet
│       ├── agripay/             # Wallet, transfer, PayLater, bills
│       ├── payment/             # Razorpay orders + verification
│       ├── auth/                # Register, login, OTP, logout
│       └── admin/               # Admin stats, users, audit logs
├── lib/
│   ├── models/                  # Mongoose schemas (User, Post, Story,
│   │                            #   Conversation, Notification, Follow,
│   │                            #   Listing, Booking, Vehicle, Wallet,
│   │                            #   Transaction, Billing, PayLater, AuditLog)
│   ├── styles.ts                # Blue & white design system
│   ├── validation.ts            # Zod schemas for all API routes
│   ├── auth.ts                  # JWT auth + role-based access
│   ├── mongodb.ts               # Connection singleton
│   ├── encryption.ts            # AES-256-GCM field encryption
│   ├── rate-limit.ts            # Redis-backed rate limiting
│   ├── cache.ts                 # Upstash Redis cache
│   ├── audit.ts                 # Audit log writer
│   ├── otp.ts                   # SMS/OTP delivery (Twilio/Fast2SMS)
│   ├── razorpay.ts              # Razorpay client + webhook verification
│   └── config.ts                # Zod-validated env config singleton
├── middleware.ts                # Security headers + CORS + request ID
├── public/                      # Icons, manifest.json
├── .env.example                 # Env var template (copy to .env.local)
└── vercel.json                  # Vercel deployment config
```

---

## 📡 API Reference

### AgriSocial
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/social/posts?feed=following\|ranked\|latest&category=&page=` | Ranked/chronological feed |
| POST | `/api/social/posts` | Create post (carousel, hashtags auto-extracted) |
| GET/DELETE | `/api/social/posts/[postId]` | Get / delete a post |
| POST | `/api/social/posts/[postId]/share` | Track a share |
| POST | `/api/social/like` | Toggle like (fires notification) |
| POST | `/api/social/comment` | Add comment (supports parentId for threads) |
| POST/DELETE | `/api/social/save` | Save / unsave a post |
| POST/GET | `/api/social/follow` | Follow / unfollow + check status |
| GET/POST | `/api/social/stories` | List grouped stories / create story |
| POST | `/api/social/stories/[id]/view` | Mark story viewed |
| GET/POST | `/api/social/dm/conversations` | List / start conversations |
| GET/POST | `/api/social/dm/messages` | Fetch / send messages |
| GET | `/api/social/notifications?type=&page=` | List notifications |
| POST | `/api/social/notifications/read` | Mark as read (single or all) |
| GET | `/api/social/search?q=&kind=` | Search users + hashtags |
| GET | `/api/social/saved` | List saved posts |
| GET | `/api/social/suggested` | Suggested users (mutuals + active) |
| GET | `/api/social/explore?category=&type=&tag=&page=` | Trending posts + hashtag filter |
| GET | `/api/social/profile?userId=&viewerId=` | Profile + posts + clips + saved + stats |
| GET | `/api/social/clips?page=&category=` | KrishiClips feed |
| GET | `/api/social/upload-signature` | Cloudinary signed upload params |

### Marketplace & Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/listings` | Browse / create buyer demand |
| GET/PUT/DELETE | `/api/listings/[id]` | Manage a listing |
| GET/POST | `/api/bookings` | Vehicle bookings |
| GET/POST | `/api/vehicles` | Transporter fleet |
| GET/POST | `/api/billing` | Invoices |
| POST | `/api/payment` | Create Razorpay order |
| POST | `/api/payment/verify` | Verify Razorpay signature |
| GET/POST | `/api/agripay/wallet` | Wallet balance |
| POST | `/api/agripay/transfer` | P2P transfer |
| POST | `/api/agripay/topup` | Wallet top-up |
| POST | `/api/agripay/withdraw` | Withdraw to bank |
| GET/POST | `/api/agripay/paylater` | PayLater status + enable |
| POST | `/api/agripay/paylater/repay` | Repay loan |

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register (farmer/buyer/transporter) |
| POST | `/api/auth/login` | Login (phone + password) |
| POST | `/api/auth/send-otp` | Send OTP via SMS |
| POST | `/api/auth/verify-otp` | Verify OTP |
| POST | `/api/auth/logout` | Clear cookie + token |

---

## 🔧 Available Scripts

```bash
npm run dev       # Start dev server (http://localhost:3000)
npm run build     # Production build (outputs to .next/)
npm run start     # Start production server (after build)
npm run lint      # Run ESLint
```

---

## 🎨 Design System

The entire app uses a unified **blue & white** palette defined in `lib/styles.ts`:

- **Primary blue ramp**: `#1d4ed8 → #2563eb → #3b82f6 → #60a5fa → #93c5fd → #bfdbfe → #dbeafe → #eff6ff`
- **Text**: `#0f172a` (ink) / `#1e293b` (secondary) / `#64748b` (muted)
- **Backgrounds**: `#f8fafc` (page) / `#ffffff` (cards)
- **Status colors** (shared): green `#059669`, red `#dc2626`, amber `#d97706`
- **Gradients**: `linear-gradient(135deg, #2563eb → #3b82f6 → #60a5fa)` for CTAs & avatars

Each module (AgriPay, AgriSocial, Auth, Buyer, Farmer, Transporter) exports its own palette object but they all reference the same blue ramp, so the brand feels consistent everywhere. Admin keeps a dark-slate theme for data-density.

---

## 📈 Performance & Scalability

- **Serverless-ready** — all routes are stateless API handlers
- **Redis caching** for Explore + Clips feeds (120s TTL, auto-invalidated on writes)
- **Database indexes** on all hot query paths (userId+createdAt, type+createdAt, hashtags, category, rankScore)
- **Pagination** on every list endpoint (configurable page size, max 100)
- **Lean queries** (`.lean()`) on read-heavy paths to skip Mongoose hydration
- **Story TTL index** — MongoDB auto-deletes expired stories (no cron needed)
- **Rate limiting** — per-user, per-route (10 posts/min, 30 likes/min, 60/min default)
- **Optimistic UI** — like, comment, follow, DM send all update instantly then reconcile
- **Polling** for DMs (5s) and stories/notifications (60s) — WebSocket upgrade is a future enhancement

---

## 🔐 Environment Variables

See [`.env.example`](./.env.example) for the full list with descriptions.

**Required:**
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — 32+ char random string
- `ENCRYPTION_KEY` — 64 hex chars (32 bytes)

**Required for payments:**
- `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `NEXT_PUBLIC_RAZORPAY_KEY_ID`

**Required for media uploads:**
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

**Optional (recommended for production):**
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — caching + distributed rate limiting
- `SMS_PROVIDER` + Twilio/Fast2SMS keys — phone OTP login
- `CORS_ORIGINS` — comma-separated allowed origins (empty = allow all in dev)

---

## 📝 License

MIT License — see [LICENSE](./LICENSE) for details.

---

**AgriEasy.com** — Empowering India's farmers and buyers through direct digital commerce. 🌾
