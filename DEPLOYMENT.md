# EMRAKEL Coolify deployment

This repository is one integrated application:

- Next.js serves the public website, `/admin`, and the tablet UI.
- Hono serves finance and reporting endpoints inside the same Next.js process.
- PostgreSQL is a separate Coolify database resource.
- The application listens on port `3000`.

Do not create separate frontend and backend applications.

## 1. Rotate the database password

The previous PostgreSQL connection string was shared in chat. Change that database
password before production use, then copy the new internal connection URL from
Coolify.

## 2. Application settings

Use these Coolify application values:

- Build pack: `Nixpacks`
- Base directory: `/`
- Port: `3000`
- Build command: `npm run build`
- Start command: `npm run start:production`
- Health check path: `/api/hono/health`

`start:production` safely applies pending migrations, creates/updates the configured
admin account, and then starts Next.js.

## 3. Environment variables

Add these as runtime environment variables. Use real secret values, not the examples.

```env
DATABASE_URL=postgresql://USER:PASSWORD@COOLIFY_POSTGRES_HOST:5432/DATABASE
DATABASE_SSL=false
DATABASE_POOL_SIZE=10

AUTH_SECRET=GENERATE_A_LONG_RANDOM_SECRET
COOKIE_DOMAIN=.httpemrakelhouse.com

ADMIN_EMAIL=owner@example.com
ADMIN_PASSWORD=USE_A_LONG_UNIQUE_PASSWORD
ADMIN_NAME=EMRAKEL Owner

IMAGE_STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
CLOUDINARY_API_KEY=YOUR_API_KEY
CLOUDINARY_API_SECRET=YOUR_API_SECRET
CLOUDINARY_FOLDER=emrakel-house
```

Cloudinary also provides one combined `CLOUDINARY_URL` value in its API Keys page.
You may use that protected variable instead of the three separate credential variables:

```env
CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
```

Never prefix Cloudinary secrets with `NEXT_PUBLIC_` and never expose the API secret
to browser-side code.

Use `DATABASE_SSL=false` for a private Coolify PostgreSQL service. If the database
provider requires TLS, set it to `true`.

## 4. Cloudinary image storage

The production image provider is Cloudinary. Every image uploaded from the admin
workspace is sent by the protected server route to the `emrakel-house` Cloudinary
asset folder. The returned HTTPS CDN URL is stored with the website/menu record, so
the homepage, gallery, menu, and waiter-ordering page fetch the image from Cloudinary.
No Docker upload volume is required.

To connect an account:

1. Sign in to the Cloudinary Console.
2. Open **Settings → API Keys** for the intended product environment.
3. Copy the Cloud Name, API Key, and API Secret into the matching protected Coolify
   environment variables above. Alternatively, copy the provided API environment
   variable into `CLOUDINARY_URL`.
4. Keep `IMAGE_STORAGE_PROVIDER=cloudinary`.
5. Redeploy the application and upload a test image from `/admin`.
6. Confirm the saved URL begins with `https://res.cloudinary.com/` and the asset is
   visible in Cloudinary Media Library under the configured folder.

Existing local, Supabase, or S3 URLs continue to display. Re-upload an existing image
through the admin workspace when you want that specific asset migrated to Cloudinary.

## 5. Domains and TLS

Add all three URLs to the same application:

```text
https://httpemrakelhouse.com
https://www.httpemrakelhouse.com
https://order.httpemrakelhouse.com
```

The order subdomain is automatically rewritten to `/orders`; the main domain keeps
the public website at `/`, and the owner uses `/admin`.

The DNS records for `@`, `www`, and `order` must point to the VPS. Keep Cloudflare
proxying disabled while Coolify requests the first certificate. After HTTPS is
healthy, Cloudflare can be enabled with SSL mode set to **Full (strict)**.

Do not enter domains without `https://` in the Coolify domain field. A misspelled
domain or a domain entered without the scheme can cause the self-signed certificate
warning shown by the browser.

## 6. First production verification

After deployment:

1. Open `/api/hono/health` and confirm it returns `{"ok":true,...}`.
2. Sign in at `/login` with `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
3. Add or edit one menu item in `/admin` and save it.
4. Open `https://order.httpemrakelhouse.com`; confirm the item and price appear.
5. Submit an order, move it through Preparing and Ready, then finish it.
6. Open Finance in `/admin`; confirm the order appears once as income.
7. Add a test expense and verify the report and net profit.
8. Upload a menu image, redeploy, and confirm the image remains available.

## 7. Backups

Enable scheduled PostgreSQL backups in Coolify. The image volume should also be
included in the VPS backup plan.
