# AgriEasy OS — Architecture

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Database**: MongoDB via Mongoose 9
- **Auth**: JWT (jsonwebtoken) + bcryptjs
- **Payments**: Razorpay (collect + verify + payouts)
- **SMS**: Fast2SMS / Twilio (pluggable)
- **Media**: Cloudinary (direct client upload, signed)
- **Encryption**: AES-256-GCM (node crypto)
- **Deploy**: Vercel (serverless)

---

## Directory Structure
```
app/
├── admin/                     # Admin console pages
│   ├── layout.tsx             # Sidebar layout (requires admin JWT)
│   ├── page.tsx               # Dashboard (stats cards + recent audit)
│   ├── users/page.tsx         # User list (search, filter, paginate)
│   ├── transactions/page.tsx  # All transactions
│   ├── posts/page.tsx         # Content moderation (delete posts)
│   └── logs/page.tsx          # Audit log viewer
├── api/
│   ├── admin/                 # Admin API (all gated by admin role)
│   │   ├── stats              # GET — dashboard counts
│   │   ├── users              # GET — list/search users
│   │   ├── users/[userId]     # GET/PATCH/DELETE — manage user
│   │   ├── transactions       # GET — all transactions
│   │   ├── wallets            # GET — all wallets
│   │   ├── posts              # GET — all posts
│   │   ├── posts/[postId]     # DELETE — remove any post
│   │   ├── audit-logs         # GET — paginated audit logs
│   │   └── migrate-encryption # POST — one-time PII migration
│   ├── auth/
│   │   ├── login              # POST — email/phone + password → JWT
│   │   ├── register           # POST — create account
│   │   ├── send-otp           # POST — generate OTP, send SMS
│   │   ├── verify-otp         # POST — validate OTP → JWT
│   │   └── [...nextauth]      # NextAuth (legacy)
│   ├── agripay/               # Digital wallet system
│   │   ├── wallet             # GET/POST — view or create wallet
│   │   ├── topup              # POST — add money (Razorpay verified)
│   │   ├── transfer           # POST — wallet-to-wallet send
│   │   ├── withdraw           # POST — wallet → bank (auto-payout)
│   │   ├── pay-bill           # POST — pay bills from wallet
│   │   ├── paylater/          # POST — borrow money
│   │   ├── paylater/repay     # POST — repay loan
│   │   ├── paylater/enable    # POST — activate paylater
│   │   ├── paylater/status    # GET — paylater eligibility
│   │   ├── verify-bank        # POST/GET — link + verify bank
│   │   └── history            # GET — transaction history
│   ├── social/                # AgriSocial network
│   │   ├── posts              # GET — feed, POST — create
│   │   ├── posts/[postId]     # GET — detail, DELETE — own post
│   │   ├── like               # POST — toggle like
│   │   ├── comment            # POST — add comment
│   │   ├── follow             # POST — toggle follow, GET — check
│   │   ├── save               # POST/DELETE — save/unsave posts
│   │   ├── clips              # GET — krishiclip feed
│   │   ├── explore            # GET — trending posts
│   │   ├── profile            # GET — user profile + stats
│   │   ├── upload             # POST — server-side upload (fallback)
│   │   └── upload-signature   # GET — signed Cloudinary creds
│   ├── listings               # GET/POST — marketplace listings
│   ├── bookings               # GET/POST — transport bookings
│   ├── billing                # GET/POST — billing records
│   ├── vehicles               # GET/POST/PATCH — transport vehicles
│   └── payment/               # Razorpay payment gateway
│       ├── route.ts           # POST — create order
│       └── verify/route.ts    # POST — verify signature
├── admin/                     # Admin pages (see above)
├── auth/                      # Login/register pages
├── farmer/                    # Farmer dashboard + sub-pages
├── buyer/                     # Buyer dashboard + sub-pages
├── transporter/               # Transporter dashboard + sub-pages
└── agrisocial/                # Social feed, create, clips, profile
```

```
lib/
├── auth.ts          # authenticateRequest(req, allowedRoles?)
├── audit.ts         # logAudit() — fire-and-forget audit entries
├── encryption.ts    # AES-256-GCM encrypt/decrypt
├── otp.ts           # OTP generate/store/verify + SMS send
├── rate-limit.ts    # rateLimitByIp() / rateLimitByUser()
├── razorpay.ts      # verifyPaymentSignature, createPayout, createFundAccount
├── validators.ts    # Aadhar (Verhoeff), DL, UPI, GSTIN, PAN, phone, PIN
├── mongodb.ts       # Mongoose connection singleton
└── models/
    ├── User.ts      # Farmer / Buyer / Transporter / Driver
    ├── Wallet.ts    # Balance, bank, paylater, encrypted fields
    ├── Transaction.ts
    ├── Post.ts      # Social posts + comments + likes + saves
    ├── Follow.ts
    ├── Booking.ts
    ├── Listing.ts
    ├── Billing.ts
    ├── Vehicle.ts
    ├── PayLater.ts
    └── AuditLog.ts  # userId, action, resource, details, ip, userAgent
```

---

## Auth Flow

```
┌─────────┐     POST /api/auth/login     ┌───────────┐
│  Client  │ ──── { identifier, password } ──►  │  Mongo    │
│          │ ◄──── { token, user } ──────── │  (User)   │
│          │     Sets httpOnly cookie        └───────────┘
│          │                                       │
│          │     Every subsequent request           │
│          │ ──── Authorization: Bearer <token> ──► │
│          │     (or cookie auto-sent)               │
└─────────┘                                        │
                                              ┌─────▼──────┐
                                              │ lib/auth.ts │
                                              │ JWT verify  │
                                              │ role check  │
                                              └─────┬──────┘
                                                    │
                                              return { userId, email, role }
```

OR via OTP:
```
POST /api/auth/send-otp → OTP stored in memory, SMS sent
POST /api/auth/verify-otp → validates OTP, returns same JWT
```

---

## AgriPay Wallet Flow

```
                    ┌─────────────────────────────┐
                    │        Razorpay             │
                    │  (test/live)                │
                    └──────┬──────────────┬───────┘
                           │              │
                    create order    verify signature
                           │              │
                    ┌──────▼──────────────▼───────┐
                    │     POST /api/agripay/topup  │
                    │  Verify HMAC → $inc balance  │
                    └─────────────┬───────────────┘
                                  │
                    ┌─────────────▼───────────────┐
                    │        Wallet (Mongo)        │
                    │  balance, bank, paylater     │
                    │  encrypted fields (AES-256)  │
                    └──┬──────────┬──────────┬────┘
                       │          │          │
              transfer  │   withdraw │   paylater
                       │          │          │
              ┌────────▼──┐ ┌─────▼────┐ ┌───▼────┐
              │ Transfer   │ │ Withdraw  │ │ PayLater│
              │ Debit A    │ │ Debit     │ │ Borrow  │
              │ Credit B   │ │ Payout or │ │ Repay   │
              │            │ │ Pending   │ │         │
              └────────────┘ └───────────┘ └─────────┘
```

**Key security**: Every mutation requires JWT auth. Rate-limited per-user. Audit-logged. Payment signatures verified against Razorpay secret.

---

## Data Protection (PII)

```
User.aadharNumber ──► encryptedString type ──► AES-256-GCM ──► "iv:ciphertext:tag" in DB
Wallet.accountNumber ──► encryptedString type ──► AES-256-GCM
Wallet.upiId ──► encryptedString type

All retrieved via Mongoose getters (transparent decrypt)
Validation via pre('validate') hooks:
  - Aadhar: Verhoeff checksum algorithm
  - Driving license: Indian state-code pattern
  - UPI: standard regex
```

---

## Audit Logging

Every mutation route calls `logAudit()`:
```
{
  userId,           // who
  action,           // CREATE | UPDATE | DELETE | LOGIN | VIOLATION
  resource,         // "Post" | "Wallet" | "User" | "Transfer" ...
  resourceId,       // Mongo _id of affected record
  details,          // { amount, method, role, ... }
  ip,               // from x-forwarded-for
  userAgent,        // from user-agent header
  createdAt         // auto
}
```

---

## Rate Limiting

| Route | Limit | Key |
|-------|-------|-----|
| POST /api/auth/login | 5/min | IP |
| POST /api/auth/register | 3/min | IP |
| POST /api/auth/send-otp | 3/min | IP |
| POST /api/auth/verify-otp | 5/min | IP |
| POST /api/agripay/topup | 10/min | userId |
| POST /api/agripay/transfer | 10/min | userId |
| POST /api/agripay/withdraw | 3/min | userId |
| POST /api/agripay/paylater | 5/min | userId |
| POST /api/agripay/paylater/repay | 10/min | userId |
| POST /api/social/posts | 10/min | userId |
| POST /api/social/like | 30/min | userId |
| POST /api/social/comment | 10/min | userId |
| POST /api/social/follow | 15/min | userId |
| POST /api/social/save | 20/min | userId |
| POST /api/social/upload | 5/min | userId |
| POST /api/listings | 10/min | userId |
| POST /api/bookings | 10/min | userId |
| POST /api/vehicles | 5/min | userId |
| PATCH /api/vehicles | 10/min | userId |
| POST /api/payment | 10/min | userId |
| POST /api/payment/verify | 10/min | userId |

---

## Media Upload Flow

```
Client (mobile/desktop)
  │
  ├── GET /api/social/upload-signature
  │      ← { cloudName, apiKey, signature, timestamp, folder }
  │
  └── POST https://api.cloudinary.com/v1_1/{cloudName}/auto/upload
         (direct upload, bypasses Vercel 4.5MB limit)
         ← { secure_url }
```

---

## Environment Variables

```
# Required
MONGODB_URI=
JWT_SECRET=                # strong random string, NOT 'your-secret-key'

# Encryption (Phase 1)
ENCRYPTION_KEY=            # 64 hex chars (32 bytes) — generate via scripts/generate-key.mjs

# Cloudinary (media)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Razorpay (payments)
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=

# SMS (choose one)
SMS_PROVIDER=fast2sms      # or 'twilio'
FAST2SMS_API_KEY=          # for Fast2SMS
TWILIO_ACCOUNT_SID=        # for Twilio
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Razorpay Payouts (live only)
RAZORPAY_ACCOUNT_TYPE=live # enables auto-payout on withdrawal
```

---

## Known Limitations

1. **OTP store**: In-memory Map — resets on Vercel cold start. For production, use Redis.
2. **Withdrawal**: Auto-payout only works with live Razorpay Payouts. Test mode falls to pending.
3. **No email**: Auth and notifications are SMS-only. No email service configured.
4. **Rate limiter**: In-memory — resets on cold start. Fine for basic protection.
5. **`admin` role**: No UI to promote a user to admin. Must be done manually via MongoDB.
