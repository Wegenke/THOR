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
    adjustments.js      — point adjustments (rewards/penalties)
    assignments.js      — assignment CRUD and state transitions
    auth.js             — getProfiles, login, logout, getSession
    chores.js           — chore library CRUD
    dashboard.js        — child and parent dashboard aggregations
    parentTasks.js      — parent to-do list management
    rewards.js          — reward CRUD and contributions
    schedules.js        — recurring chore schedule management
    setup.js            — first-time household setup
    transactions.js     — point transaction history
    users.js            — user management
  components/
    AdjustPointsModal.jsx     — parent award/penalize points modal
    ApprovalCard.jsx          — parent approve/reject UI
    AssignmentRow.jsx         — assignment row in parent chores tab
    AvatarCustomizerModal.jsx — full avatar customization
    AvatarPicker.jsx          — DiceBear style selector
    ChildDashboardTab.jsx     — child dashboard tab (today, missed, rewards)
    ChildSummaryCard.jsx      — per-child summary on parent dashboard
    ChoreCard.jsx             — child assignment tile with action buttons
    ChoreForm.jsx             — create/edit chore form
    ChoreTemplateCard.jsx     — chore template card in parent library
    ChoresTab.jsx             — parent chore library + assignments tab
    ClaimCard.jsx             — available-to-claim assignment tile
    CommentThread.jsx         — assignment comment display and input
    CreateRewardModal.jsx     — parent create reward modal
    EmojiPicker.jsx           — emoji selector for chore creation
    HistoryTab.jsx            — child transaction history tab
    LockoutTimer.jsx          — per-user countdown on 429 lockout
    ParentHistoryTab.jsx      — parent history tab (transactions + missed)
    ParentRewardsTab.jsx      — parent reward management tab
    ParentToDoTab.jsx         — parent to-do list tab
    ParentUsersTab.jsx        — parent user management tab
    PinPad.jsx                — touch-friendly numeric keypad
    ProfileSelector.jsx       — profile grid for login screen
    ProfileSettingsModal.jsx  — edit own nick_name, avatar, PIN
    ReconnectingBanner.jsx    — shown when Odin is unreachable
    RequestRewardModal.jsx    — child reward request flow
    RewardCard.jsx            — reward card (used by both parent and child views)
    RewardDetailModal.jsx     — reward detail modal with actions
    RewardsTab.jsx            — child rewards tab
    TaskNotesModal.jsx        — notes modal for parent tasks
    UnassignedRow.jsx         — unassigned pool row in parent chores tab
    UnseenAdjustmentsModal.jsx — child login notification for point adjustments
    UserForm.jsx              — create/edit user form
    ViewAsChildModal.jsx      — parent view-as-child overlay
    VirtualKeyboard.jsx       — on-screen keyboard for kiosk input
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
| Parent — To-Do List | Parent | Complete |
| Profile Settings (edit own nick_name, avatar, PIN) | Both | Complete |

---

## API

All data comes from Odin. Base path is set via `VITE_API_URL`.

Thor uses session-based auth (cookie). Axios is configured with `credentials: 'include'` so the session cookie is sent automatically on every request.

| Resource | Base Path |
| --- | --- |
| Auth | `/auth` |
| Users | `/users` |
| Chores | `/chores` |
| Assignments | `/assignments` |
| Rewards | `/rewards` |
| Transactions | `/transactions` |
| Dashboard | `/dashboard` |
| Schedules | `/schedules` |
| Parent Tasks | `/parent-tasks` |
| Adjustments | `/adjustments` |
| Setup | `/setup` |
| Health | `/health` |

Full API reference with request/response details: see [`reference_docs/odin-reference.md`](reference_docs/odin-reference.md).

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
