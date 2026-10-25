# Google login and MongoDB Atlas

The app supports Google Identity Services and either local MongoDB or Atlas.
External accounts are not provisioned by these code changes. Keep using the free
Atlas M0 plan. The Gemini API key is unrelated to Google login.

## 1. Set up Google login

1. Open https://console.cloud.google.com/auth/overview and choose your project.
2. Configure Branding (app name, support email and contact email) and Audience.
   Use External if people outside a Workspace organization need access. If the
   project remains in Testing, add the Google accounts you intend to test with.
3. Under Clients, create an OAuth client of type **Web application**.
4. Add `http://localhost:5173` under Authorized JavaScript origins. If you use
   `http://127.0.0.1:5173`, add that separately and set CLIENT_URL to that exact
   origin. For deployment add the final HTTPS frontend origin too.
5. Copy the client ID (ending in `.apps.googleusercontent.com`) into the root
   `.env` as `GOOGLE_CLIENT_ID=...`. Do not use the Gemini key here.
6. Restart the API and refresh the frontend. Both login and registration pages
   show Google's official Continue with Google button. No redirect URI or client
   secret is required for this popup/JavaScript credential flow.

The backend verifies the signed Google ID token using Google's library, including
audience, issuer and expiry, plus verified email and a short-lived nonce. It uses
Google's stable subject identifier for returning users. Existing password users
must use their password; automatic email-based account linking is intentionally
not supported. Google-only accounts cannot log in with a password.

The frontend fetches the public OAuth client ID from `/api/auth/google/config`;
there is no frontend secret or separate VITE variable. If deploying behind a
Content Security Policy, allow the Google Identity Services script and frames
as described in Google's setup documentation. Google/network errors keep email
login available. An expired login challenge can be renewed with Retry.

## 2. Set up free MongoDB Atlas

1. Open https://cloud.mongodb.com and create a **Free (M0)** cluster.
   Do not choose Flex or a paid dedicated cluster.
2. Create a database user under Database Access. Grant `readWrite` on `mokka_ai`.
   This database user is separate from your Atlas website login.
3. Under Network Access, add the current public IP of the machine running the
   backend. When deploying, add the hosting service's documented outbound IPs.
4. Select Connect → Drivers → Node.js and copy the connection string into the
   root `.env` as MONGODB_URI, replacing the local MongoDB value.
   Use the `mokka_ai` database in the URL path. Percent-encode special characters
   in the database username/password. Never paste this URI into chat or Git.
5. Run `npm run check:atlas`. It pings Atlas without printing credentials.
6. Run `npm run seed` once to add/update the 28 reference entries, then restart
   the API with `npm run dev`.

Example structure only (replace placeholders privately):

```dotenv
GOOGLE_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb+srv://USERNAME:ENCODED_PASSWORD@YOUR_CLUSTER.mongodb.net/mokka_ai?retryWrites=true&w=majority
```

Switching databases does **not** move existing local users or analysis history.
Local data remains intact. A new Atlas database starts with new accounts; any
data migration should be planned separately. Seeding only upserts references.

## Activation checks

- `npm test` and `npm run build` check the application code.
- `npm run check:atlas` verifies the actual Atlas connection after setup.
- Confirm Google sign-in creates one account, repeat sign-in reuses it, and
  password login still works. Real browser login needs the configured OAuth client.
- Verify the library loads 28 references and analysis/history work on Atlas.

References: https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
and https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
and https://www.mongodb.com/docs/atlas/tutorial/deploy-free-tier-cluster/.
