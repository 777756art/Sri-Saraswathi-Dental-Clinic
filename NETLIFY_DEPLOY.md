# Netlify website and clinic API

The Netlify dist folder contains the static website only. The Express API runs as a separate Render service and stores accounts, bookings, and website content in MongoDB Atlas.

## Local API setup

Copy .env.api.example to .env.api, then fill in your private MongoDB Atlas connection string and local admin password. The actual .env.api file is ignored by Git. Run npm run dev to start the API and Vite together.

## Render backend settings

- **Build Command:** `npm ci --omit=dev`
- **Start Command:** `npm start`
- **MONGODB_URI:** add the private Atlas connection string as a Render secret; never commit it to Git.
- **SITE_ORIGIN:** `https://srisarashwathidentals.netlify.app` (no trailing slash)
- **ADMIN_PASSWORD:** set a strong private password before the first start
- **SESSION_SECRET:** generate this in Render; the Blueprint creates one automatically

Do not run `npm run build` on the Render API service. It is the Vite/TypeScript frontend build and needs development packages. Netlify builds the frontend separately.

The Blueprint keeps a persistent disk for uploaded media and legacy data migration. If server/data/clinic.db already exists on that disk, the API copies users, bookings, and managed content into MongoDB once at startup and leaves the SQLite file in place. The initial admin email is admin@srisaraswathidental.com; its password is the value set in ADMIN_PASSWORD when the MongoDB database is empty.

After the Render service is live, check `<Render service URL>/api/health`; it should return `{ "ok": true }`.

## Netlify frontend settings

Set `VITE_API_BASE_URL` to the Render service URL, for example:

```env
VITE_API_BASE_URL=https://your-service.onrender.com
```

If Netlify is connected to Git, set this in the Netlify environment variables and redeploy. If you manually upload `dist`, set it in `.env.production`, run `npm run build`, then upload the fresh `dist` folder.

`dist` by itself does not contain the API, so login and registration will not work until the Render service is deployed and the frontend is rebuilt with its URL.
