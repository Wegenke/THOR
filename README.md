# Thor

The kiosk frontend for Chore Tracker. A React/Vite app served as static files — runs in Chromium kiosk mode on the touchscreen Pi, and is also accessible from any browser on the LAN.

---

## Stack

| Layer | Technology |
| --- | --- |
| Framework | React |
| Build tool | Vite |
| Server state | TanStack Query |
| Local state | React Context |
| HTTP client | Axios |
| Avatars | DiceBear (@dicebear/core + @dicebear/collection) |
| Language | JavaScript |

---

## Prerequisites

- Node.js (LTS)
- Odin running locally (for API calls during development)

---

## Environment Variables

Create `.env.development` in the root of this directory:

```env
VITE_API_URL=/api
```

The `/api` prefix is proxied by Vite's dev server to `http://localhost:8080` (Odin), making requests same-origin and allowing session cookies to work correctly. No manual CORS configuration needed in dev.

For production, `.env.production` is:

```env
VITE_API_URL=http://odin
```

In production, Nginx handles the routing — there is no proxy prefix.

---

## Local Setup

```bash
# Install dependencies
npm install

# Start the development server (runs on port 3333)
npm run dev
```

App is available at `http://localhost:3333`.

Odin must be running at `http://localhost:8080` for API calls to work.

---

## Project Structure

```text
THOR/
  src/
    api/
      client.js         — axios instance (baseURL from VITE_API_URL, credentials: include)
      auth.js           — getProfiles, login, logout, getSession
    components/
      ProfileSelector.jsx   — profile grid for login screen
      PinPad.jsx            — touch-friendly numeric keypad
      LockoutTimer.jsx      — per-user countdown on 429 lockout
      AvatarPicker.jsx      — DiceBear option pickers (future)
      ChoreCard.jsx         — assignment tile with action buttons (future)
      RewardCard.jsx        — reward progress tile (future)
      ApprovalPanel.jsx     — parent approve/reject UI (future)
      TransactionList.jsx   — paginated point history (future)
      ReconnectingBanner.jsx — shown when Odin is unreachable (future)
    context/
      AuthContext.jsx    — current user, login(), logout()
    views/
      LoginView.jsx      — profile selection + PIN entry
      ChildView.jsx      — child dashboard
      ParentView.jsx     — parent dashboard
  .env.development
  .env.production
  vite.config.js
```

---

## Screens

| Screen | Role | Status |
| --- | --- | --- |
| Login (profile selector + PIN pad) | All | Planned |
| Child Dashboard | Child | Planned |
| Parent Dashboard | Parent | Planned |
| Reward Detail | Both | Planned |

---

## API

All data comes from Odin. Base path is set via `VITE_API_URL`.

Key endpoints used by Thor:

| Endpoint | Purpose |
| --- | --- |
| `GET /auth/profiles` | Profile grid for login screen |
| `POST /auth/login` | PIN login |
| `POST /auth/logout` | Destroys session |
| `GET /auth/session` | Restore session on page reload |
| `GET /dashboard/child` | Aggregated child dashboard data |
| `GET /dashboard/parent` | Aggregated parent dashboard data |
| `PATCH /assignments/:id/...` | Assignment state transitions |
| `POST /rewards/:id/contribute` | Contribute points to a reward |

Full API reference: see `odin-reference.md` in the project docs.

---

## Production

Thor runs as static files served by Nginx on a Raspberry Pi 5. Chromium runs in kiosk mode on the attached touchscreen.

GitHub Actions builds `dist/` on every push to the `thor` repo and commits it back. The Pi pulls the pre-built files nightly — no build tools run on the Pi.

See `thor-deployment.md` in the project docs for the full setup guide.

Accessible from any LAN device at `http://thor`.
