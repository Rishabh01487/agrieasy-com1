# AgriEasy Security Audit Report
**Date:** 2026-11-11
**Scope:** Full destructive security audit of the AgriEasy application — API routes, auth flows, outbound integrations, and live production endpoints.
**Commit:** `5670af8` (pre-audit baseline) → `<post-fix commit>` (post-audit)

## Methodology

Three parallel audits were conducted:

1. **Static source audit** of all 79 API routes under `app/api/**/route.ts` for missing auth, missing CSRF, IDOR, missing role checks, raw error leaks, NoSQL injection, and password/secret leaks.
2. **Outbound integration audit** for SSRF, secret leakage, webhook signature validation, hardcoded secrets, open redirect, and file-upload risks.
3. **Live black-box pentest** of https://agrieasy.site — security headers, CORS, CSRF, unauth access, error disclosure, rate limits, source/dotfile exposure, method whitelisting.

## Findings & Fixes

### Critical

| # | Class | Location | Status |
|---|---|---|---|
| C1 | SSRF | `app/api/ledger/bill-calc/route.ts` POST — accepted arbitrary `body.imageUrl` and forwarded it to Z-AI vision API; unauthenticated attacker could submit `http://169.254.169.254/...` (cloud metadata), `http://localhost:27017`, or any internal IP and the model would read the response back as text. | ✅ **Fixed** — `imageUrl` now validated against `res.cloudinary.com` (or `<cloud-name>.cloudinary.com` if `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is set); only direct file upload (base64) is accepted otherwise. |
| C2 | SSRF | `app/api/ledger/bill-calc-proxy/route.ts` POST — same flaw via the SDK proxy variant. | ✅ **Fixed** — same Cloudinary-only allowlist applied. |
| C3 | Secret leak | `app/api/ledger/bill-calc/route.ts:155-162` `callZaiVision` — when the direct call to Z-AI failed, fell back to `https://api.allorigins.win/raw?url=...` forwarding the full `Authorization: Bearer ${config.apiKey}` header (plus X-Chat-Id / X-User-Id / X-Token). The operator of `api.allorigins.win` could sniff the Z-AI API key from inbound requests. | ✅ **Fixed** — allorigins fallback removed entirely; now surfaces a clean 503 if the direct call fails. |
| C4 | IDOR | `app/api/billing/route.ts:37` POST — any logged-in user could create billings attributed to arbitrary `bookingId`/`farmerId`/`buyerId` without verifying they were party to that booking. | ✅ **Fixed** — added CSRF guard, restricted to `buyer`/`farmer` roles, validates `objectId` format, fetches the booking and verifies the caller is either the buyer or farmer of it AND that body's `farmerId`/`buyerId` match the booking's actual parties. |

### High

| # | Class | Location | Status |
|---|---|---|---|
| H1 | Missing CSRF | 28 routes — admin (migrate-encryption, users/[userId], posts/[postId]), agripay/paylater, bookings/[id] PATCH, payment/verify, buyer-vehicles/[id], vehicles POST/PATCH, listings/[id] PATCH/DELETE, ledger POST/PATCH, billing POST, location POST, buyer/farmer/social profile PATCH, social collections/highlights/dm-conversations/dm-messages/posts DELETE, social save DELETE, posts/share POST, comment/like POST, stories/[id]/like, stories/[id]/view, clips/[id]/view, notifications/read, **auth/logout** (logout CSRF), agripay/wallet POST. | ✅ **Fixed** — `verifyCsrf(request)` added as the first line of every mutating handler. |
| H2 | CSRF + logout bug | `lib/auth-fetch.ts` `logout()` used plain `fetch` (not `authFetch`), so it would not send the `X-CSRF-Token` header. With H1's logout CSRF applied, this would have blocked legitimate logouts. | ✅ **Fixed** — `logout()` now reads the `csrf_token` cookie from `document.cookie` and sends it as `X-CSRF-Token`. |
| H3 | Upload policy | `app/api/social/upload-signature/route.ts` — signed only `{timestamp, folder}`; clients could specify any `public_id` (overwrite another user's profile picture / stories / clips) and any file format. | ✅ **Fixed** — server now derives `public_id` from `userId + timestamp + randomBytes(4)` and includes it in `paramsToSign`. Client cannot choose `public_id`. All 8 client callers updated to forward the new signed `public_id` field. (Format/size limits should also be set via a Cloudinary upload preset in the dashboard — recommended operational follow-up.) |

### Medium

| # | Class | Location | Status |
|---|---|---|---|
| M1 | PII leak | `app/api/agripay/verify-bank/route.ts:65-69` POST — returned the raw `wallet` document; the Wallet model's `toJSON` getter exposes the DECRYPTED `accountNumber`, `ifscCode`, `bankHolder`, `upiId`, and `razorpayFundAccountId`. | ✅ **Fixed** — returns the same masked shape as the GET handler (`accountNumberMasked: XXXX XXXX <last4>`). |
| M2 | PII leak | `app/api/agripay/wallet/route.ts:51` POST (wallet-exists branch) — same raw wallet leak. | ✅ **Fixed** — returns the same `safeWallet` shape as the GET handler. |
| M3 | Debug leak | `app/api/ledger/bill-calc/route.ts:388-405` POST catch block — returned `error.message` AND a `debug` object exposing which `ZAI_*` env vars were set/missing, plus `NODE_ENV` / `VERCEL` flags. Reachable by anonymous users (route allows unauthenticated access). | ✅ **Fixed** — returns a generic `'Could not scan the bill. Please try a clearer photo.'` message; `console.error` retained for server-side debugging. |
| M4 | Debug leak | `app/api/ledger/bill-calc/route.ts:414-459` GET health-check — returned the same `debug` object to ANY logged-in user. | ✅ **Fixed** — restricted to admin role + removed `debug` object + removed `baseUrl` from response. |
| M5 | Raw error leak | `app/api/listings/route.ts:136` GET catch — returned `{ error, detail: e.message }`. | ✅ **Fixed** — `detail` field removed. |
| M6 | Raw error leak | `app/api/listings/route.ts:235` POST catch — returned `error.message` for ValidationFailed/required paths. | ✅ **Fixed** — returns static `'Failed to create listing'`. |
| M7 | Raw error leak | `app/api/auth/register/route.ts:66-67` — returned `error.message` to anonymous client (leaks bcrypt/Zod/Mongoose internals during registration). | ✅ **Fixed** — returns generic `'Registration failed. Please try again.'`. |
| M8 | Raw error leak | `app/api/auth/verify-otp/route.ts:86-87` — same pattern. | ✅ **Fixed** — returns generic `'OTP verification failed. Please try again.'`. |
| M9 | Raw error leak | `app/api/bookings/route.ts:231-233` — returned `error.message`. | ✅ **Fixed** — ValidationError → 400 `'Invalid booking data'`, otherwise 500 `'Failed to create booking'`. |
| M10 | Raw error leak | `app/api/vehicles/route.ts:97-99` — returned `e.message`. | ✅ **Fixed** — returns static `'Invalid vehicle data'` / `'Failed to create vehicle'`. |

### Low / Informational (not fixed in this pass — operational follow-ups)

| # | Class | Location | Note |
|---|---|---|---|
| L1 | Hardcoded key | `app/api/social/music/search/route.ts:4` — DES key `38346591` (publicly-known JioSaavn reverse-engineered constant). Not exploitable for SSRF; using DES is deprecated. Cosmetic. |
| L2 | Test secrets in scripts | `scripts/verify-auth-flow.mts:8-9` — hardcoded test `ENCRYPTION_KEY` and `JWT_SECRET`. Not used in production runtime; `lib/auth.ts:13` already rejects `your-secret-key` but does not reject these specific test values. |
| L3 | No Razorpay webhook | No `app/api/webhooks/razorpay/route.ts` exists. Razorpay payment verification is done client-side via HMAC (correctly), but no webhook endpoint means `payment.failed` / `refund.processed` / `payout.failed` events are not reconciled. **Recommended:** add a webhook that verifies `X-Razorpay-Signature` HMAC-SHA256 over the raw body with `RAZORPAY_WEBHOOK_SECRET`. |
| L4 | CSP permissive | `middleware.ts:11-20` — `script-src` includes `'unsafe-inline'` AND `'unsafe-eval'`; `connect-src` includes public CORS proxies `corsproxy.io` and `api.allorigins.win` (the latter is no longer used after C3 fix — can be removed from CSP). |
| L5 | Method override 405 | `/api/auth/providers` returns 400 (not 405) on POST — functionally rejected but method whitelisting isn't explicit. Cosmetic. |
| L6 | Anonymous OCR | `/api/ledger/bill-calc` and `/api/ledger/bill-ocr` allow unauthenticated access (intentional — for users testing the app). IP rate-limited. Now CSRF-guarded. |
| L7 | Schema leak in errors | Zod validation errors reveal field names (e.g. `"field":"phone","message":"Invalid input..."`) — minor info disclosure. Cosmetic. |

## Verified Clean (no action needed)

The following were checked and found to be already-correct in the pre-audit baseline:

- **JWT verification** — pinned to `HS256` algorithm (no algorithm-confusion attack); `authenticateRequestAsync` checks `tokenVersion` against DB for sensitive endpoints (revocation works).
- **CSRF primitive** — double-submit cookie pattern with constant-time comparison; `csrf_token` cookie is `Secure; SameSite=Lax` in production.
- **Rate limiting** — fail-closed in production (returns 503 if Redis is unreachable); per-IP, per-user, and per-account variants available.
- **Input validation** — Zod schemas + `xss` sanitization on every body field; no NoSQL injection (no raw `req.body` passed to Mongoose queries).
- **Password hashing** — bcrypt with 10 rounds.
- **Password/secret leak** — every route returning user data uses `.select('-password')` or a hand-built safe object; no `password`/`tokenVersion`/`googleId` leaks.
- **IDOR defenses** — present in `bookings/[id]` PATCH, `buyer-vehicles/[id]` PATCH/DELETE, `listings/[id]` PATCH/DELETE, `social/posts/[postId]` DELETE, `location` POST/GET, `payment/verify`, `agripay/paylater/repay`, `social/dm/messages` GET/POST, `social/notifications/read`.
- **Open redirect** — NextAuth's `redirect()` callback correctly validates origin; no `NextResponse.redirect(searchParams.get(...))` patterns anywhere.
- **Live headers** — HSTS, X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy, Permissions-Policy all present on production.
- **CORS** — production fails closed; no `Access-Control-Allow-Origin: *` on any API route.
- **Source/dotfile exposure** — `.env`, `.git/config`, `next.config.js`, `server.js` all return 404 on production.
- **Admin role checks** — every `app/api/admin/*` route uses `authenticateRequest(req, ['admin'])` and rejects `!roleMatch`.

## Recommendations (operational follow-ups not done in code)

1. **Set up a Cloudinary unsigned upload preset** in the Cloudinary dashboard with `allowed_formats: jpg,jpeg,png,webp,gif,mp4,mov,webm,mp3,wav,m4a` and `max_file_size: 10MB`. Update the `upload-signature` route to return the preset name and have clients use it. This complements the H3 fix with account-level format/size enforcement.
2. **Add a Razorpay webhook endpoint** at `app/api/webhooks/razorpay/route.ts` that verifies `X-Razorpay-Signature` via HMAC-SHA256 over the raw body with `RAZORPAY_WEBHOOK_SECRET`, and reconciles `payment.failed` / `refund.processed` / `payout.failed` events.
3. **Tighten CSP** in `middleware.ts`:
   - Remove `https://api.allorigins.win` from `connect-src` (no longer used after C3 fix).
   - Remove `https://corsproxy.io` if not actively used.
   - Long-term: replace `'unsafe-inline'` and `'unsafe-eval'` with nonces/hashes.
4. **Rotate the leaked Z-AI API key** if any logs show the allorigins fallback was exercised in production before this fix.
5. **Rotate the API key** the user accidentally pasted in chat (`AIzaSyA-5...`) — it is in the conversation history.
