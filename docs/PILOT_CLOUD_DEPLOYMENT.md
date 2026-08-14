# ReaDirect Pilot Cloud Deployment

This deployment runs without a developer computer after publishing:

- `pilot.readirect.org`: Cloudflare Pages frontend.
- `api-pilot.readirect.org`: Render Laravel API.
- Supabase: PostgreSQL data in the private `readirect_v2` schema.
- Published English and Filipino WAV catalogs: bundled into the API image.
- ASR, runtime Vox TTS, and Reverb: intentionally unavailable in pilot mode.
- Clara's new Word Rescue activity: unavailable until its seven new lines have
  approved prerecorded English and Filipino audio.

Never commit or share the Supabase password, database connection string,
Laravel `APP_KEY`, system administrator password, or Google App Password.

## 1. Supabase values

In the Supabase project, open **Connect** and select **Session pooler** on port
`5432`. Record these values privately:

- Host -> `DB_HOST`
- Port -> `DB_PORT` (`5432`)
- Database -> `DB_DATABASE` (`postgres`)
- User -> `DB_USERNAME` (usually `postgres.<project-ref>`)
- Database password -> `DB_PASSWORD`

Do not use the direct IPv6 endpoint or the transaction pooler on port `6543`.
Do not create tables manually. The API startup creates the private schema and
runs the Laravel migrations.

## 2. Generate the Laravel application key

From the repository root on the deployment workstation:

```powershell
Set-Location apps/api
php artisan key:generate --show
Set-Location ../..
```

Save the complete `base64:...` result privately for Render's `APP_KEY` field.
Do not add it to an environment file in the repository.

## 3. Create the Render service from the Blueprint

1. In Render, choose **New > Blueprint**.
2. Connect `mendezjerick/ReaDirect-V2`.
3. Select branch `pilot/cloud-deployment` if Render asks for a branch.
4. Confirm that Render detects `/render.yaml`.
5. Name the Blueprint `readirect-pilot`.
6. Render will propose one free web service named `readirect-pilot-api` in
   Singapore.
7. Enter every secret requested by the Blueprint:

| Render key              | Private value                                             |
| ----------------------- | --------------------------------------------------------- |
| `APP_KEY`               | Complete `base64:...` value generated above               |
| `DB_HOST`               | Supabase Session pooler host                              |
| `DB_USERNAME`           | Supabase Session pooler username                          |
| `DB_PASSWORD`           | Supabase database password                                |
| `SYSTEM_ADMIN_USERNAME` | Pilot system administrator username                       |
| `SYSTEM_ADMIN_PASSWORD` | New strong pilot administrator password                   |
| `MAIL_USERNAME`         | Complete Gmail address used by the existing App Password  |
| `GMAIL_APP_PASSWORD`    | Existing 16-character Google App Password, without spaces |
| `MAIL_FROM_ADDRESS`     | Exactly the same Gmail address as `MAIL_USERNAME`         |

8. Choose **Apply** to create the service.
9. Do not add a persistent disk, ASR service, TTS service, background worker,
   Render Postgres database, or Render Key Value instance.

The first deploy builds the API image, creates the `readirect_v2` schema, runs
all migrations, creates or updates the pilot system administrator, and
publishes the English and Filipino TTS catalog records. Later cold starts skip
the expensive catalog seed when both 300-line catalogs are already complete.

If Blueprint creation cannot load a non-default branch, create a **Web
Service** manually with these values:

| Field                | Value                       |
| -------------------- | --------------------------- |
| Name                 | `readirect-pilot-api`       |
| Repository           | `mendezjerick/ReaDirect-V2` |
| Branch               | `pilot/cloud-deployment`    |
| Region               | Singapore                   |
| Language             | Docker                      |
| Root Directory       | blank                       |
| Dockerfile Path      | `./apps/api/Dockerfile`     |
| Docker Build Context | `.`                         |
| Instance Type        | Free                        |
| Health Check Path    | `/up`                       |

Then copy all non-secret and secret environment values from `render.yaml` into
the Render Environment page.

## 4. Verify the initial Render deployment

Wait for the log to show:

```text
Starting ReaDirect pilot API on port 10000...
```

Then open:

```text
https://readirect-pilot-api.onrender.com/up
```

The response should report a healthy application. A free Render service can
take approximately one minute to wake after an idle period.

## 5. Connect the API custom domain

1. In Render, open `readirect-pilot-api`.
2. Open **Settings > Custom Domains**.
3. Add `api-pilot.readirect.org`.
4. In Cloudflare DNS, create the CNAME target Render displays.
5. Keep the record **DNS only** while Render verifies the domain and issues its
   certificate.
6. After Render shows the domain as verified, test
   `https://api-pilot.readirect.org/up`.

## 6. Build the pilot frontend

The licensed Live2D SDK is intentionally not stored in Git, so build the web
artifact from the prepared workstation:

```powershell
corepack pnpm --filter @readirect/web build:pilot
```

The output is `apps/web/dist`. The build embeds only the public API origin and
the pilot-mode switch; it does not contain database or Gmail secrets.

## 7. Publish Cloudflare Pages

For the first direct upload:

```powershell
npx wrangler pages project create readirect-pilot
npx wrangler pages deploy apps/web/dist --project-name readirect-pilot --branch production
```

Wrangler opens Cloudflare authorization if the workstation is not signed in.
After the upload:

1. Open **Cloudflare > Workers & Pages > readirect-pilot**.
2. Open **Custom domains**.
3. Add `pilot.readirect.org`.
4. Wait for the domain to become active.

The computer can be shut down after the upload. Cloudflare, Render, and
Supabase continue running the pilot.

## 8. Acceptance checks

1. Open `https://pilot.readirect.org` in a private browser window.
2. Confirm learner and staff sign-in.
3. Confirm English and Filipino published Clara audio play.
4. Open an assessment or Lessons 1-5 and confirm the page says:
   `ASR is unavailable during pilot testing.`
5. Open Clara's Word Rescue activity and confirm its published-audio pilot
   notice appears.
6. Confirm no request is sent to an ASR or Vox service.
7. Request a staff verification email and confirm Gmail delivery.
8. Let Render idle, then confirm the frontend tolerates the first API wake-up.
9. Confirm new pilot records appear in Supabase under schema `readirect_v2`.
