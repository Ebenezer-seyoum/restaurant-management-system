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

IMAGE_STORAGE_PROVIDER=s3
AWS_REGION=eu-central-1
AWS_S3_BUCKET=emrakel-images
AWS_S3_PUBLIC_URL=https://your-cloudfront-or-public-s3-url
AWS_S3_ENDPOINT=
AWS_S3_FORCE_PATH_STYLE=false
UPLOAD_DIR=/app/public/uploads/admin
UPLOAD_PUBLIC_URL=/uploads/admin
```

For S3 uploads, also add `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` as protected
Coolify secrets. The bucket must allow reads through its configured public URL, or
`AWS_S3_PUBLIC_URL` should point to a CloudFront distribution. Never expose AWS
credentials to browser-side code.

Use `DATABASE_SSL=false` for a private Coolify PostgreSQL service. If the database
provider requires TLS, set it to `true`.

## 4. Image storage

The recommended production configuration uses S3. In that mode, image files remain
available across deployments and no Docker upload volume is required. Use a public
S3/CloudFront URL in `AWS_S3_PUBLIC_URL` and store the AWS keys as protected Coolify
secrets.

If S3 is unavailable, the local provider is still supported for development or a
single VPS:

In the application resource, add persistent storage:

- Type: Docker volume
- Destination path: `/app/public/uploads`
- Suggested volume name: `emrakel-uploads`

Without this volume, local-provider uploads can disappear when the container is
replaced during a deployment. This does not affect S3 uploads.

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
