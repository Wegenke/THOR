# Thor

A family chore tracking dashboard. Built with React and Vite, designed for touchscreen kiosk use but accessible from any browser.

Thor is a frontend-only application — all data and business logic comes from the [Odin](https://github.com/Wegenke/odin) backend API.

---

## Stack

| Layer | Technology |
| --- | --- |
| Framework | React |
| Build tool | Vite |
| Server state | TanStack Query |
| Local state | React Context |
| HTTP client | Axios |
| CSS | Tailwind CSS (@tailwindcss/vite) |
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

For production, set `VITE_API_URL` to the URL where Odin is accessible:

```env
VITE_API_URL=/odin
```

The exact value depends on your deployment — it should match whatever path or URL your reverse proxy uses to reach the Odin API.

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
src/
  api/
    client.js           — axios instance (baseURL from VITE_API_URL, credentials: include)
    auth.js             — getProfiles, login, logout, getSession
    assignments.js      — assignment CRUD and state transitions
    chores.js           — chore library CRUD
    dashboard.js        — child and parent dashboard aggregations
    rewards.js          — reward CRUD and contributions
    schedules.js        — recurring chore schedule management
    setup.js            — first-time household setup
    transactions.js     — point transaction history
    users.js            — user management
  components/
    ProfileSelector.jsx — profile grid for login screen
    PinPad.jsx          — touch-friendly numeric keypad
    LockoutTimer.jsx    — per-user countdown on 429 lockout
    ChoreCard.jsx       — assignment tile with action buttons
    ChoreForm.jsx       — create/edit chore modal form
    ChoreTemplateCard.jsx — chore library card with assign buttons
    ClaimCard.jsx       — available-to-claim assignment tile
    ApprovalCard.jsx    — parent approve/reject UI
    RewardCard.jsx      — reward management tile (parent)
    ChildSummaryCard.jsx — per-child summary on parent dashboard
    CommentThread.jsx   — assignment comment display
    EmojiPicker.jsx     — curated emoji grid for chore icons
    AssignmentRow.jsx   — active assignment row with inline actions
    UnassignedRow.jsx   — unassigned pool row with assign/cancel
    ChoresTab.jsx       — parent chore library + assignments tab
    HistoryTab.jsx      — child history tab
    ParentHistoryTab.jsx — parent history tab
    ParentRewardsTab.jsx — parent reward management tab
    ParentUsersTab.jsx  — parent user management tab
    RewardsTab.jsx      — child rewards tab
    UserForm.jsx        — create/edit user form
    AvatarPicker.jsx    — DiceBear style selector
    AvatarCustomizerModal.jsx — full avatar customization
    ProfileSettingsModal.jsx  — edit own nick_name, avatar, PIN
    RequestRewardModal.jsx    — child reward request flow
    ReconnectingBanner.jsx    — shown when Odin is unreachable
    VirtualKeyboard.jsx — on-screen keyboard for kiosk input
  context/
    AuthContext.jsx     — current user, login(), logout()
    KboardContext.jsx   — virtual keyboard state
  hooks/
    useIdleTimer.js     — auto-logout after inactivity
    useKboard.js        — virtual keyboard integration
    useOdinHealth.js    — API connectivity monitoring
  utils/
    avatar.js           — DiceBear avatar generation helpers
  views/
    LoginView.jsx       — profile selection + PIN entry
    SetupView.jsx       — first-time household + parent creation
    ChildView.jsx       — child dashboard (chores, rewards, history)
    ParentView.jsx      — parent dashboard (approvals, chores, users, rewards, history)
  App.jsx               — routing and layout
  main.jsx              — app entry point
reference_docs/         — thor-reference and odin API reference
```

---

## Screens

| Screen | Role | Status |
| --- | --- | --- |
| Login — profile selector | All | Complete |
| Login — PIN pad | All | Complete |
| Setup — first-time household setup | None (unauthenticated) | Complete |
| Child — My Chores | Child | Complete |
| Child — Available to Claim | Child | Complete |
| Child — Rewards | Child | Complete |
| Child — History | Child | Complete |
| Parent — Dashboard (approvals + summaries) | Parent | Complete |
| Parent — Chore Library & Assignments | Parent | Complete |
| Parent — User Management | Parent | Complete |
| Parent — Reward Management | Parent | Complete |
| Parent — History | Parent | Complete |
| Profile Settings (edit own nick_name, avatar, PIN) | Both | Complete |

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
| `GET /setup` | Check if setup is needed |
| `POST /setup` | Create household + first parent |

Full API reference: see [`reference_docs/odin-reference.md`](reference_docs/odin-reference.md).

---

## Production Build

```bash
npm run build
```

This outputs static files to `dist/`. Serve with any static file server or reverse proxy (Nginx, Caddy, etc.).

If deploying behind a sub-path (e.g., `/thor/`), set `base` in `vite.config.js`:

```js
export default defineConfig({
  base: '/thor/',
  // ...
})
```

For detailed architecture and UX documentation, see [`reference_docs/thor-reference.md`](reference_docs/thor-reference.md).
