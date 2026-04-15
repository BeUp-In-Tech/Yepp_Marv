# Coupon App Backend API Documentation

Generated from source code on **April 15, 2026**.

## 1. Overview

- API version prefix: `/api/v1`
- Local base URL (default): `http://localhost:3002`
- Main API base URL: `http://localhost:3002/api/v1`
- Health endpoint: `GET /`
- Stripe webhook endpoint: `POST /webhook` (outside `/api/v1`)

This backend supports:

- JWT auth + refresh token flow
- Vendor onboarding and shop management
- Deals/promotions/payments
- Dashboard analytics
- Static CMS pages
- Notification delivery (DB + FCM + queue workers)

## 2. Tech Stack

- Runtime: Node.js + TypeScript + Express 5
- Database: MongoDB (Mongoose)
- Cache/session: Redis
- Queue: BullMQ workers
- File/media: Cloudinary
- Payments: Stripe + Apple IAP + Google Play IAP
- Push notifications: Firebase Admin (FCM)
- Auth providers: Credentials + Google OAuth + Apple Sign In

## 3. Quick Start (Full Setup)

### 3.1 Prerequisites

- Node.js 20+
- MongoDB running
- Redis running
- Cloudinary account
- Stripe account/webhook secret
- Google OAuth + Google Play service credentials
- Apple Sign-In credentials
- Firebase service account credentials

### 3.2 Install

```bash
yarn install
```

### 3.3 Environment

Copy `.env.example` to `.env` and fill all values:

```bash
cp .env.example .env
```

All required keys are listed in `.env.example` and validated in `src/app/config/env.ts`.

### 3.4 Run API + Worker (Development)

```bash
yarn dev
yarn worker:dev
```

### 3.5 Production

```bash
yarn build
yarn start
```

`yarn start` uses PM2 (`ecosystem.config.js`) and starts:

- `server` (cluster mode)
- `Worker` (single process)

## 4. Environment Variables (Required)

The complete set is in `.env.example`. Required groups:

- Core: `PORT`, `MONGO_URI`, `NODE_ENV`
- JWT/OTP: `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRATION`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRATION`, `OTP_JWT_ACCESS_SECRET`, `OTP_JWT_ACCESS_EXPIRATION`
- App URLs: `FRONTEND_URL`, `BACKEND_URL`, `DEEP_LINK`
- Security/rate limit: `BCRYPT_SALT_ROUND`, `REQUEST_RATE_LIMIT`, `REQUEST_RATE_LIMIT_TIME`, `EXPRESS_SESSION_SECRET`
- Redis: `REDIS_HOST`, `REDIS_PORT`
- Cloudinary: `CLOUDINARY_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_SECRET`
- Email SMTP: `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USER`, `EMAIL_PASSWORD`, `EMAIL_FROM`, `EMAIL_FROM_NAME`
- Google auth: `GOOGLE_OAUTH_ID`, `GOOGLE_OAUTH_SECRET`, `GOOGLE_CALLBACK_URL`, `GOOGLE_ANDROID_CLIENT_ID`, `GOOGLE_IOS_CLIENT_ID`
- Apple auth: `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_PRIVATE_KEY`, `APPLE_IOS_CLIENT_ID`, `APPLE_WEB_CLIENT_ID`, `APPLE_WEB_REDIRECT_URI`
- Firebase: `TYPE`, `PROJECT_ID`, `PRIVATE_KEY_ID`, `PRIVATE_KEY`, `CLIENT_EMAIL`, `CLIENT_ID`, `AUTH_URI`, `TOKEN_URI`, `AUTH_PROVIDER_X509_CERT_URL`, `CLIENT_X509_CERT_URL`, `UNIVERSE_DOMAIN`
- Stripe: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
- Admin seed: `ADMIN_MAIL`, `ADMIN_PASSWORD`

Optional but used by Google IAP verification flow:

- `GOOGLE_SERVICE_ACCOUNT` (JSON string)

## 5. Auth and Authorization

### 5.1 Authentication Header

Protected routes require:

```http
Authorization: Bearer <accessToken>
```

### 5.2 Roles

- `USER`
- `VENDOR`
- `ADMIN`

### 5.3 Token Flow

1. Login/register/social auth returns `accessToken` + `refreshToken`
2. Use `accessToken` in `Authorization` header
3. Refresh tokens via `POST /api/v1/auth/generate_token`

## 6. Global Response and Error Format

### 6.1 Success Response

```json
{
  "statusCode": 200,
  "success": true,
  "message": "Fetched deals",
  "data": {},
  "meta": {}
}
```

### 6.2 Error Response

```json
{
  "success": false,
  "message": "Validation failed message",
  "errorSources": [],
  "err": null,
  "stack": null
}
```

## 7. Request Conventions

### 7.1 JSON vs Multipart

- JSON endpoints use `Content-Type: application/json`
- File upload endpoints use `multipart/form-data`

### 7.2 Multipart + `data` JSON Pattern

For some routes, structured payload is expected in `data` field as JSON string:

- `POST /api/v1/shop/create_shop`
- `POST /api/v1/service`
- `PATCH /api/v1/service/:dealId`

### 7.3 Common QueryBuilder Parameters

Some list endpoints support:

- `searchTerm`
- `sort` (e.g. `-createdAt`)
- `page`
- `limit`
- `fields` (comma-separated field selection)
- `join` format: `path-field1|field2,path2-field3|field4`

## 8. Complete API Endpoint Reference

Base prefix: `/api/v1` unless noted.

## 8.1 System

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/` | Public | Health/welcome route |
| POST | `/webhook` | Public (Stripe) | Stripe webhook listener |

## 8.2 Auth Module (`/auth`)

| Method | Endpoint | Auth | Request |
|---|---|---|---|
| POST | `/auth/login` | Public | `{ "email", "password" }` |
| POST | `/auth/change_password` | Any logged user | `{ "oldPassword", "newPassword" }` |
| GET | `/auth/forget_password/:email` | Public | Path param `email` |
| POST | `/auth/verify_otp` | Public | `{ "email", "otp" }` |
| POST | `/auth/reset_password` | Public | Header `token`, body `{ "newPassword" }` |
| POST | `/auth/generate_token` | Public | `{ "refreshToken" }` |
| GET | `/auth/google` | Public | Optional query `redirectTo` |
| GET | `/auth/google/callback` | Public | Google callback handler |
| POST | `/auth/google/auth` | Public | `{ "id_token", "access_token?" ... }` |
| POST | `/auth/apple` | Public | `{ "code", "user_name?", "email?" }` |
| POST | `/auth/apple/callback` | Public | Apple callback payload |

Notes:

- `google/callback` redirects to frontend/deep link with tokens in query.
- `google/auth` and `/apple` are mobile-friendly non-redirect auth flows.

## 8.3 User Module (`/user`)

| Method | Endpoint | Auth | Request |
|---|---|---|---|
| POST | `/user/register` | Public | `{ "user_name", "email", "password?" }` |
| PATCH | `/user/` | Any logged user | `{ "user_name" }` |
| GET | `/user/get_me` | Any logged user | None |
| POST | `/user/verification_otp` | Public | `{ "email" }` |
| POST | `/user/verify_profile` | Public | `{ "email", "otp" }` |
| DELETE | `/user/delete_account` | Any logged user | None |
| POST | `/user/register_fcm` | Any logged user | `{ "token", "platform", "deviceId", "deviceName?" }` |
| PATCH | `/user/unregister_fcm` | Any logged user | `{ "deviceId" }` |
| GET | `/user/get_device` | Any logged user | None |

Validation notes:

- `platform` must be one of `WEB`, `IOS`, `ANDROID`
- password regex requires uppercase + number + special char

## 8.4 Shop Module (`/shop`)

| Method | Endpoint | Auth | Request |
|---|---|---|---|
| POST | `/shop/create_shop` | `VENDOR` | Multipart: `file` + `data` JSON |
| GET | `/shop/shop_details` | Public | Query: `shopId` or `myId` |
| PATCH | `/shop/update_shop/:shopId` | `VENDOR` or `ADMIN` | Multipart optional `file` + update fields |
| GET | `/shop/analytics` | `VENDOR` | None |
| GET | `/shop/yearly_analytics` | `VENDOR` | None |

Create shop `data` example:

```json
{
  "shop": {
    "business_name": "Coffee Lab",
    "business_email": "hello@coffeelab.com",
    "business_phone": { "country_code": "+1", "phone_number": "1234567890" },
    "description": "Specialty coffee and bakery.",
    "website": "https://coffeelab.com"
  },
  "outlet": [
    {
      "outlet_name": "Main Branch",
      "address": "123 Main St",
      "zip_code": "10001",
      "coordinates": [90.4125, 23.8103]
    }
  ]
}
```

## 8.5 Category Module (`/category`)

| Method | Endpoint | Auth | Request |
|---|---|---|---|
| POST | `/category/` | `ADMIN` | Multipart: `file` + `category_name` |
| GET | `/category/` | Public | Query: `delete=true|false` |
| PATCH | `/category/:categoryId` | `ADMIN` | Multipart optional `file`, body optional `category_name`, `isDeleted` |
| DELETE | `/category/:categoryId` | `ADMIN` | None |

## 8.6 Outlet Module (`/outlet`)

| Method | Endpoint | Auth | Request |
|---|---|---|---|
| PATCH | `/outlet/?outletId=<id>` | Logged user (vendor ownership enforced) | `{ "outlet_name?", "address?", "zip_code?", "coordinates?" }` |

`coordinates` must be `[lng, lat]`.

## 8.7 Deal Module (`/service`)

| Method | Endpoint | Auth | Request |
|---|---|---|---|
| POST | `/service/` | `VENDOR` | Multipart fields: `files[]`, `qr?`, `upc?`, `data` JSON |
| GET | `/service/deals/all_deals/:lng/:lat` | Public | Query: `searchTerm?`, `page?`, `limit?` |
| GET | `/service/deals/analytic/:dealId` | `VENDOR` | Path param `dealId` |
| GET | `/service/deals/:lng/:lat` | Public | Query: `page?`, `limit?` |
| GET | `/service/my_deals` | `VENDOR` | QueryBuilder params + `deal_filter` (`promoted`, `expired`, `new`) |
| GET | `/service/saved` | Public | Query: `ids=id1,id2,...` + paging |
| GET | `/service/:dealId/:lng/:lat` | Public | Path params required |
| GET | `/service/c/:categoryId` | Public | Query: `lat`, `lng`, `page?`, `limit?`, `sort?` |
| DELETE | `/service/:dealId` | `VENDOR` | None |
| PATCH | `/service/:dealId` | `VENDOR` | Multipart: same pattern as create, all optional updates |
| GET | `/service/top_viewed_deals` | `VENDOR` | Query: `page?`, `limit?` |

Create deal `data` example:

```json
{
  "category": "6800d0b0f9f4e50bc1a11111",
  "title": "50% Off Pasta",
  "reguler_price": 20,
  "discount": 50,
  "highlight": ["Dine in", "Dinner"],
  "tags": ["italian", "pasta"],
  "description": "Valid for all pasta items.",
  "coupon": "PASTA50",
  "available_in_outlet": ["6800d0b0f9f4e50bc1a22222"]
}
```

Media constraints:

- `qr` image must be exactly `500x500`
- `upc` image must be exactly `800x400`
- `files` max count in upload middleware: 10

## 8.8 Plan Module (`/plan`)

| Method | Endpoint | Auth | Request |
|---|---|---|---|
| POST | `/plan/` | `ADMIN` | Multipart: `file` + `{ title, short_desc, price, currency?, durationDays }` |
| GET | `/plan/` | Public | None |
| PATCH | `/plan/:planId` | `ADMIN` | Multipart optional `file`, partial body |
| DELETE | `/plan/:planId` | `ADMIN` | None |

## 8.9 Voucher Module (`/voucher`)

| Method | Endpoint | Auth | Request |
|---|---|---|---|
| POST | `/voucher/` | `ADMIN` | `{ voucher_code, voucher_discount, voucher_validity, voucher_limit }` |
| GET | `/voucher/` | `ADMIN` | None |
| GET | `/voucher/apply_voucher` | Logged user | Query: `voucher_code` |
| GET | `/voucher/:voucherId` | `ADMIN` | None |
| PATCH | `/voucher/:voucherId` | `ADMIN` | Partial voucher body |
| DELETE | `/voucher/:voucherId` | `ADMIN` | None |

## 8.10 Payment Module (`/payment`)

| Method | Endpoint | Auth | Request |
|---|---|---|---|
| POST | `/payment/api/apple_in_app_purchase` | Public (current implementation) | Receipt payload (`serverVerificationData`, `dealId`, etc.) |
| POST | `/payment/api/google_in_app_purchase` | Public (current implementation) | `{ productId, serverVerificationData, dealId, price, currency }` |
| POST | `/payment/stripe_pay` | Logged user (service enforces `VENDOR`) | `{ dealId, planId, voucher? }` |
| POST | `/webhook` | Stripe | Stripe signed webhook event |

Stripe flow:

1. Call `/payment/stripe_pay`
2. Redirect to returned `checkout_url`
3. Stripe sends webhook to `/webhook`
4. Backend marks payment `PAID` and activates promotion

## 8.11 Notification Module (`/notification`)

| Method | Endpoint | Auth | Request |
|---|---|---|---|
| GET | `/notification/` | Public (current implementation) | Query: `userId?`, `page?`, `limit?` |
| PATCH | `/notification/:id` | Public (current implementation) | Path param `id` |

## 8.12 Dashboard Module (`/dashboard`)

All endpoints require `ADMIN`.

| Method | Endpoint | Request |
|---|---|---|
| GET | `/dashboard/deals_by_category_stats` | None |
| GET | `/dashboard/vendor_stats` | Query: `searchTerm?`, `sort?`, `page?`, `limit?` |
| GET | `/dashboard/recent_deals` | QueryBuilder params |
| GET | `/dashboard/deals_stats` | Query: `searchTerm?`, `page?`, `limit?`, `sortBy?` |
| GET | `/dashboard/dashboard_analytics_total` | None |
| GET | `/dashboard/last_one_year_revenue_trend` | None |
| GET | `/dashboard/latest_transactions` | QueryBuilder params |
| POST | `/dashboard/send_notification_and_email` | `{ title, message, channel, to }` |

Send notification payload:

```json
{
  "title": "Platform Maintenance",
  "message": "Maintenance window at 2:00 AM UTC.",
  "channel": { "push": true, "email": true },
  "to": { "all_users": true, "active_vendors": true }
}
```

## 8.13 Static Content Module (`/static`)

| Method | Endpoint | Auth | Request |
|---|---|---|---|
| POST | `/static/create_page` | `ADMIN` | `{ slug, title, content }` |
| GET | `/static/all_pages` | Public | None |
| GET | `/static/:slug` | Public | Path `slug` |
| PATCH | `/static/:slug` | `ADMIN` | Partial update body |

Allowed slugs:

- `about-us`
- `contact-us`
- `help-support`
- `terms-condition`
- `privacy-policy`

## 9. cURL Examples

### 9.1 Credentials Login

```bash
curl -X POST http://localhost:3002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"vendor@example.com","password":"Password@123"}'
```

### 9.2 Get My Profile

```bash
curl http://localhost:3002/api/v1/user/get_me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### 9.3 Create Deal (Multipart)

```bash
curl -X POST http://localhost:3002/api/v1/service \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -F 'files=@/path/deal-1.jpg' \
  -F 'files=@/path/deal-2.jpg' \
  -F 'qr=@/path/qr-500x500.png' \
  -F 'upc=@/path/upc-800x400.png' \
  -F 'data={"category":"6800d0b0f9f4e50bc1a11111","title":"Promo","reguler_price":20,"discount":50,"highlight":["A"],"tags":["t"],"description":"Long enough description","coupon":"PROMO50","available_in_outlet":["6800d0b0f9f4e50bc1a22222"]}'
```

### 9.4 Create Stripe Checkout Session

```bash
curl -X POST http://localhost:3002/api/v1/payment/stripe_pay \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"dealId":"<DEAL_ID>","planId":"<PLAN_ID>","voucher":"WELCOME10"}'
```

## 10. Operational Notes

- Redis is required for caching, sessions, and OTP.
- Queue connection (`src/app/queue/index.queue.ts`) is hardcoded to `127.0.0.1:6379`.
- For non-local Redis in workers, update queue connection config.
- API rate limiting is enabled globally (`REQUEST_RATE_LIMIT`, `REQUEST_RATE_LIMIT_TIME`).
- Admin user is auto-seeded at startup via `ADMIN_MAIL` + `ADMIN_PASSWORD`.

## 11. Known Security/Design Notes (As Implemented)

- Notification routes currently have no auth middleware.
- In-app purchase endpoints are currently public.
- Some service-layer errors use generic `Error(...)` strings; normalize to `AppError` for cleaner API contracts.

## 12. World-Class Documentation Strategy (Recommended)

Adopt this strategy to keep docs best-in-class as the API grows:

1. OpenAPI as source of truth
- Maintain `openapi.yaml` in-repo.
- Every route change must include OpenAPI update in same PR.

2. Contract-first CI gates
- Add OpenAPI linting (Spectral).
- Block merges if undocumented paths/schemas are detected.

3. Versioned docs
- Keep `/api/v1` and future `/api/v2` docs side by side.
- Publish deprecation timelines per endpoint.

4. Example-rich references
- Add request/response examples for all happy/error paths.
- Include webhook payload samples and retry semantics.

5. Consumer tooling
- Auto-generate Postman collection + SDKs from OpenAPI.
- Add "Try it" docs portal (Swagger UI/Redoc).

6. Reliability notes per endpoint
- Document idempotency expectations.
- Document rate limits, pagination limits, and cache behavior.

7. Release discipline
- Add changelog section per release:
  - Added endpoints
  - Breaking changes
  - Behavior changes
  - Migration steps

---

If you want, I can generate a full **OpenAPI 3.1 spec** for these endpoints next, so you can directly plug this into Swagger UI and Postman generation.

