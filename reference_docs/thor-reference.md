# Thor — Frontend Reference

## Build Status

### Screens

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
| Reward Detail | Both | Retired |
| Profile Settings (edit own nick_name, avatar, PIN) | Both | Complete |

### Components

| Component | Status |
| --- | --- |
| ProfileSelector | Complete |
| PinPad | Complete |
| LockoutTimer | Complete |
| AvatarPicker | Complete (AvatarCustomizerModal) |
| ChoreCard | Complete |
| ApprovalCard | Complete |
| ChildSummaryCard | Complete |
| CommentThread | Complete |
| RewardCard | Complete |
| MyRewardCard | Removed (unified into RewardCard) |
| ClaimCard | Complete |
| RequestRewardModal | Complete |
| ChoresTab | Complete |
| ChoreTemplateCard | Complete |
| ChoreForm | Complete |
| EmojiPicker | Complete |
| AssignmentRow | Complete |
| UnassignedRow | Complete |
| HistoryTab | Complete |
| RewardsTab | Complete |
| ProfileSettingsModal | Complete |
| UserForm | Complete |
| VirtualKeyboard | Complete |
| ProgressBar | Retired |
| ParentRewardsTab | Complete |
| ReconnectingBanner | Complete |
| ApprovalPanel | Complete (implemented as ApprovalCard) |
| TransactionList | Complete (implemented as TransactionRow in ParentHistoryTab) |

### Infrastructure

| Item | Status |
| --- | --- |
| Vite scaffold | Complete |
| vite.config.js (port 3333, dev proxy) | Complete |
| Environment files (.env.development / .env.production) | Complete |
| Axios client | Complete |
| AuthContext | Complete |
| App shell (role-based view routing) | Complete |
| DiceBear local avatar rendering | Complete |
| Virtual keyboard (KboardContext + VirtualKeyboard + useKboard) | Complete |
| 5-minute inactivity auto-logout | Complete |
| ReconnectingBanner (Odin health polling) | Complete |
| GitHub Actions build workflow | Optional — automates `dist/` commits on push |

---

This is the single reference document for the Thor frontend. It covers the stack, architecture, views and components, kiosk UX requirements, and architecture decisions.

Thor serves **both parents and children**. All users log in via the same PIN-based profile selector, and are routed to role-appropriate views on success. There is no separate admin app — parent management functionality is part of Thor.

---

## Stack

| Layer | Technology |
| --- | --- |
| Framework | React |
| Build tool | Vite |
| Server state | TanStack Query (React Query) |
| Local state | React Context |
| Language | JavaScript |

Responsibilities:
- UI rendering and user interaction
- API communication with Odin
- Server state caching, background refetching, and optimistic updates
- Auth state management (current user, session)

---

## How Thor Connects to Odin

All data comes from Odin's API. The base URL is set via environment variable:

Production (set to wherever Odin is hosted):

```env
VITE_API_URL=/odin
```

Local development:

```env
VITE_API_URL=/api
```

The Vite dev server runs on **port 3333** (configured in `vite.config.js`) to avoid conflicts with other local Vite projects. Odin's dev port is 8080, and `CLIENT_URL` in Odin's `.env` is set to `http://localhost:3333` accordingly.

All requests are made with `credentials: 'include'` to send the session cookie cross-origin.

---

## State Management

**TanStack Query** manages all server state:
- Chores, assignments, rewards, users, transactions
- Handles caching, background refetching, and cache invalidation
- Optimistic updates improve perceived performance on the kiosk touchscreen
- Essential because this is a multi-user app — one person's action (parent approves a chore) must update another person's view (child sees points increase)

**React Context** manages local-only state:
- Currently authenticated user (from session)
- Theme (if applicable)

---

## Layout Architecture

Thor runs in **landscape orientation** on the kiosk touchscreen. All layouts are designed for landscape first.

### Authenticated shell (ChildView, ParentView)

Single-row header pinned at the top:

```text
[ name  ·  pts badge  ·············  Tab1  Tab2  Tab3  Tab4  ·············  ⚙️  Logout ]
```

- Name + points badge: left
- Tab bar: centered
- Logout: right
- Content area below: fills remaining height, vertical scroll
- Tab navigation: tap a tab label **or** swipe left/right within the content area (`react-swipeable`)

### Assignment / content cards

Grid layout — **3 columns** (`grid-cols-3`) for most areas. The **Chore Library** uses **2 columns** (`grid-cols-2`) with a fixed-height scroll container (`max-h-[26rem]`) and bottom fade, showing ~2.5 rows before scrolling.

### Login — Profile Selector

Split layout: **parents on the left, children on the right**, each in a 2-column grid. Requires `role` field in `GET /auth/profiles` response (confirmed present).

### Login — PinPad

Split layout: **user info + PIN dots on the left, keypad grid on the right**. Uses landscape width rather than stacking vertically.

---

## Planned Views

Navigation model: tab-based within each role. No URL routing — view state is managed in React. The app is always in one of these sections; the active tab persists while the user is logged in. Tabs are navigable by tap or by left/right swipe on the content area.

---

### Setup (unauthenticated — first run only)

Shown when `GET /auth/profiles` returns an empty array (no household exists yet).

- Collect household name, parent name, nickname (optional), PIN + confirm PIN
- Default avatar generated from entered name (`{ style: "pixel-art", seed: name }`) — editable later via Profile Settings
- On submit → `POST /setup`
- On success → invalidate profiles query → profile selector appears with the new parent

---

### Login / Profile Selection (Complete)

- Profile grid showing all household members (name + DiceBear pixel-art avatar)
- Large touch targets (minimum 48px)
- PIN entry keypad — no keyboard needed
- On PIN success → role-appropriate view
- On 429 → disable tile, show per-user countdown; other tiles unaffected

---

### Child — My Chores

Primary data: `GET /dashboard/child` (single call returns balance, chores, reward progress)

- Points balance prominent at top
- List of active assignments (assigned, in_progress, paused, parent_paused, rejected) — each rendered as a ChoreCard
- ChoreCard actions per status:
  - `assigned` → Start
  - `in_progress` → Pause, Submit
  - `paused` → Resume, Submit
  - `parent_paused` → Resume
  - `rejected` → Resume (resume-rejected endpoint — preserves original started_at)
  - `submitted` → pending badge only (no child action until reviewed)
- Expand a ChoreCard → shows CommentThread (assignment comments)
- Reward progress bars at bottom (funded % per active reward)

---

### Child — Available to Claim

Data: `GET /assignments/available`

- List of unassigned chore assignments the child can claim
- Each card shows chore title, emoji, points, and Claim button
- `PATCH /assignments/:id/claim` — race-safe on the backend
- After claiming → assignment moves to My Chores as `assigned`

---

### Child — Rewards

Data: `GET /dashboard/child` (rewards array, annotated with `my_contribution` and `refund_requested` per child)

- Filter pills: **All / Mine / Shared** — Mine filters by `created_by === user.id`, Shared by `is_shared === true`
- **Request Reward** button → opens RequestRewardModal (`POST /rewards`)
- **Refunds (N)** button → opens Pending Refunds modal listing rewards where `refund_requested === true`; grayed/disabled if none pending
- All rewards rendered as RewardCard in a 3-column grid
- Each RewardCard shows: name, optional description, split progress bar, "You've contributed X pts" when applicable, Contribute + Request Refund buttons
- **Progress bar**: split into two indigo segments — darker (`indigo-500`) for the current child's contribution, lighter (`indigo-300/40`) for other children's combined contributions; empty portion is the dark background. All data from `my_contribution` and `contributed_total` already present on the dashboard response — no extra endpoint needed.
- **`reward.link` not shown in Thor** — URL entry on a kiosk is impractical; link display is deferred to the mobile client where clipboard and browser access are available.
- **Contribute button**: active (indigo) when `canInteract && status !== 'funded'`; muted indigo when funded or not interactable; tapping opens inline `− / pts / + / ✓ / ✕` single-row stepper (step 10, clamped to remaining)
- **Request Refund button**: active (rose) when `my_contribution > 0 && !refund_requested`; "Refund Pending" (amber muted) when `refund_requested`; grayed when `my_contribution === 0`
- Cards where `!canInteract` (not shared, not created by this child) are `opacity-60` with Contribute disabled
- `MyRewardCard` component removed; all reward display unified through `RewardCard`
- **Pending Approval section**: rewards with `status === 'pending'` shown above the grid as a list with "Awaiting approval" badge — child can see their request was received while waiting for parent action

---

### Child — History

Data: `GET /transactions/mine` (paginated)

- Paginated list of all point activity
- Positive entries: chore_approved
- Negative entries: reward_contribution
- Positive refund entries: reward_refund
- Filter by source (optional)

---

### Parent — Dashboard (Approvals + Summaries)

Primary data: `GET /dashboard/parent` (single call returns pending approvals + children summaries)

- **Approvals queue** (main panel): all `submitted` assignments waiting for review
  - Each item shows child name, chore title, emoji, submitted_at
  - Approve → `PATCH /assignments/:id/approve` — awards points immediately
  - Reject → `PATCH /assignments/:id/reject` — requires comment (CommentThread input inline)
  - Dismiss → `PATCH /assignments/:id/dismiss` — no points, no comment required
  - Expand → CommentThread for that assignment
- **Children summary** panel: each child's name, avatar, points balance
- **"Pause All"** button — `PATCH /assignments/pause-all-active` — parent-pauses every in_progress assignment (dinner, bedtime use case)

---

### Parent — Chore Library & Assignments

Data: `GET /chores` (templates), `GET /assignments` (active assignments)

- **Chore Library** (left panel): 2-column grid of chore template cards, scrollable with bottom fade (max ~2.5 rows visible)
  - Card layout (optimized for 1024×600): row 1 = emoji left + pts/cog right; row 2 = title + description (single-line truncated); row 3 = schedule badges (purple, grouped by frequency); row 4 = assign buttons
  - Tapping title/description opens a full-detail info popup (emoji, title, full description, points, schedule management) — Close button to dismiss
  - Info popup includes ScheduleManager: lists active schedules per child with Pause/Resume, Edit (inline frequency/day picker), and Delete controls
  - ⚙ cog icon in card header opens edit modal (`PATCH /chores/:id`)
  - Assign buttons: blue = no schedule (opens recurrence prompt), purple = schedule exists (one-time assign), Pool = one-time to unassigned pool
  - Recurrence prompt: One-time, Daily, Weekly (day picker), Monthly (date picker 1-28). Creating a schedule also creates the first assignment via `POST /schedules`
  - 2-second per-button cooldown after assign (green ✓) prevents accidental double-assigns while allowing rapid multi-child assignment
  - Create → `+ New` button opens create modal (`POST /chores`)
  - Both create/edit modals use the same ChoreForm component in a centered overlay
- **Active Assignments** (right panel, top): independently scrollable list of live assignments
  - Status filter pills: All, Assigned, Active, Paused, Submitted, Rejected
  - Child filter pills: All + one per child
  - Expandable cards with inline actions: Pause, per-child Reassign buttons, → Pool (unassign back to pool), Cancel
- **Unassigned Pool** (right panel, bottom): independently scrollable compact rows, capped height to give Active Assignments more room
  - Always-visible actions: per-child Assign buttons + Cancel (✕)
  - Touch-optimized button sizes (px-3 py-2 text-sm)
  - Visually distinct from active assignments (compact rows vs expandable cards)

---

### Parent — User Management

Data: `GET /users`, `GET /users/pin_changes`

- List of all household members with name, avatar, role, status
- **PIN change banner**: if any user changed PIN in last 5 days (`GET /users/pin_changes`) — awareness feature
- Create new user → `POST /users` (UserForm: name, nick_name, avatar, role, PIN)
- Edit user → `PATCH /users/:id` (UserForm: name, nick_name, avatar, role, or PIN reset) — this is how a parent changes a child's nick_name, avatar, or resets a forgotten PIN
- Deactivating users: set status to `inactive` (soft delete — future feature)

---

### Parent — Reward Management

Data: `GET /rewards?sort=progress` (all rewards with `contributed_total`), `GET /rewards/refund-requests`

Six section pills: **Pending | Active | Funded | Refunds | Redeemed | Archived** — always 3-column grid regardless of item count. Pending, Funded, and Refunds pills show count badges when non-zero.

- **Pending**: reward requests awaiting parent decision
  - Approve → inline expand: numeric input for `points_required` (virtual keyboard, must be multiple of 10) + ✓ / ✕; `PATCH /rewards/:id/approve`
  - Reject → `PATCH /rewards/:id/reject` (reward → archived)
  - Shows requester name (cross-referenced from profiles query)
- **Active**: approved rewards currently being contributed to
  - Progress bar (indigo) shows total contributions vs points_required
  - Shared badge shown when `is_shared === true`
  - Cancel & Refund All → `PATCH /rewards/:id/cancel` (auto-refunds all contributions, reward → archived)
- **Funded**: fully funded, awaiting delivery
  - Mark Redeemed → `POST /rewards/:id/redeem`
- **Refunds**: pending refund requests from children (`GET /rewards/refund-requests`)
  - Grouped by `(reward_id, child_id)` with points summed — approve/reject act on the full pair
  - Approve Refund → `PATCH /rewards/:id/approve-refund/:childId` (returns points; reverts funded → active if needed)
  - Reject Refund → `PATCH /rewards/:id/reject-refund/:childId` (resets `refund_requested` flag)
- **Redeemed**: delivered rewards awaiting archival
  - Archive → `PATCH /rewards/:id/archive` (violet button)
- **Archived**: read-only history; dimmed cards, no actions

---

### Parent — History

Data: `GET /transactions/` (all household, paginated), `GET /transactions/:id` (per child)

- Household-wide paginated transaction history
- Filter by source (chore_approved, reward_contribution, reward_refund)
- Tap a child name → drill into `GET /transactions/:id` for that child only

---

### Reward Detail — Retired

No separate Reward Detail screen. Child reward interaction is fully inline on RewardCard. Per-child contribution breakdown (`GET /rewards/:id/progress`) and `reward.link` display are deferred to the mobile client. Parent reward detail actions are accessible from Parent — Reward Management.

---

### Profile Settings (Both roles)

Data: `GET /users/me` (via session), `PATCH /users/me`

Accessed via a gear/settings icon in the header bar — not a tab, since it's not a primary workflow. Available to both parents and children at any time.

New users arrive with a default avatar, null nick_name, and a parent-set PIN. Profile Settings is where they personalize their account. Existing users can return here any time to update their preferences.

- **Nick_name** — set or change display nickname
- **Avatar** — AvatarCustomizerModal with live DiceBear preview across 6 styles (pixel-art, adventurer, bottts, croodles, fun-emoji, dylan); per-style color/feature options; HSV custom color picker (2D saturation square + vertical hue strip, pointer-capture drag, no typing required); saves `avatar` object via `PATCH /users/me`
- **PIN change** → PinChangeForm (enter current PIN, new PIN, confirm new PIN)
- **Name is not editable here** — `name` is set by a parent at creation and does not change. Only a parent can update a user's name via User Management (`PATCH /users/:id`)

---

## Component Plan

| Component | Purpose |
| --- | --- |
| ProfileSelector | Grid of household members for login screen; renders each avatar via DiceBear pixel-art from the user's `avatar` jsonb object |
| PinPad | Touch-friendly PIN entry keypad; handles wrong PIN feedback and triggers lockout state |
| LockoutTimer | Countdown display shown on a locked profile tile; counts down from 30s; re-enables tile on expiry |
| AvatarPicker | DiceBear pixel-art picker with live preview; used in Profile Settings and UserForm; saves `avatar` object via PATCH /users/me or PATCH /users/:id. **Status: Complete** (AvatarCustomizerModal) |
| ChoreCard | Displays a single assignment with emoji icon, title, status, and role-appropriate action buttons |
| CommentThread | View and add comments on a chore assignment; opened via a 💬 modal (not inline accordion) from ChoreCard and ApprovalCard; auto-opens on ChoreCard when status is `rejected` so child immediately sees why |
| RewardCard | Displays a reward with split indigo progress bar (darker = mine, lighter = others), contribution info, and Contribute + Request Refund buttons; interactability gated by `is_shared` or `created_by`; `reward.link` not shown (deferred to mobile client); replaced MyRewardCard |
| ProfileSettingsModal | Inline modal for editing own nick_name and PIN; accessible via gear icon in header; PIN change is an inline section (not a separate component); calls PATCH /users/me |
| UserForm | Parent create/edit household user — name, nick_name, role (segmented toggle, not native select), PIN; AvatarPicker deferred |
| EmojiPicker | Inline panel of curated chore emojis (70 options); supports 1 or 2 emoji per chore; built on `Intl.Segmenter` for multi-codepoint emoji handling; used by ChoreForm |
| VirtualKeyboard | On-screen QWERTY + numeric keyboard (`react-simple-keyboard`); activates on touch devices only; managed via KboardContext; QWERTY has shift, 123/symbol layer; numeric is a compact numpad |
| ProgressBar | Retired — progress bar folded directly into RewardCard as inline split-segment logic; no separate component needed |
| ApprovalPanel | Parent review UI for a submitted assignment — approve/reject (with required comment)/dismiss inline. **Status: Complete** (implemented as ApprovalCard) |
| TransactionList | Paginated point history with source labels and filter controls. **Status: Complete** (implemented as TransactionRow in ParentHistoryTab) |
| ReconnectingBanner | Fixed amber banner at viewport top when Odin is unreachable; polls `GET /health` every 10s; auto-dismisses on reconnect. **Status: Complete** |

---

## API Coverage

Every ODIN endpoint mapped to its Thor consumer. All must be covered before the app is feature-complete.

### Auth (Complete)

| Endpoint | Consumer |
| --- | --- |
| GET /auth/profiles | ProfileSelector |
| POST /auth/login | PinPad |
| POST /auth/logout | Logout button (ChildView, ParentView) |
| GET /auth/session | AuthContext (session restore on mount) |

### Setup

| Endpoint | Consumer |
| --- | --- |
| GET /setup | Not used directly — empty profiles array from /auth/profiles is the signal |
| POST /setup | SetupView |

### Users

| Endpoint | Consumer |
| --- | --- |
| GET /users | Parent — User Management |
| POST /users | Parent — User Management (UserForm) |
| GET /users/pin_changes | Parent — User Management (PIN change banner) |
| PATCH /users/me | Profile Settings (nick_name, avatar, PIN) |
| GET /users/:id | Parent — User Management (edit view) |
| PATCH /users/:id | Parent — User Management (UserForm) |

### Chores

| Endpoint | Consumer |
| --- | --- |
| GET /chores | Parent — Chore Library & Assignments |
| POST /chores | Parent — Chore Library (create template) |
| PATCH /chores/:id | Parent — Chore Library (edit template) |

### Assignments

| Endpoint | Consumer |
| --- | --- |
| GET /assignments | Parent — Chore Library & Assignments |
| GET /assignments/mine | Child — My Chores |
| POST /assignments | Parent — Chore Library (assign chore to child) |
| PATCH /assignments/pause-all-active | Parent — Dashboard (Pause All button) |
| GET /assignments/available | Child — Available to Claim |
| PATCH /assignments/:id/claim | Child — Available to Claim (ChoreCard) |
| PATCH /assignments/:id/start | Child — My Chores (ChoreCard) |
| PATCH /assignments/:id/submit | Child — My Chores (ChoreCard) |
| PATCH /assignments/:id/pause | Child — My Chores (ChoreCard) |
| PATCH /assignments/:id/resume | Child — My Chores (ChoreCard) |
| PATCH /assignments/:id/resume-rejected | Child — My Chores (ChoreCard) |
| PATCH /assignments/:id/approve | Parent — Dashboard (ApprovalPanel) |
| PATCH /assignments/:id/reject | Parent — Dashboard (ApprovalPanel + required comment) |
| PATCH /assignments/:id/dismiss | Parent — Dashboard (ApprovalPanel) |
| PATCH /assignments/:id/cancel | Parent — Chore Library & Assignments |
| PATCH /assignments/:id/reassign | Parent — Chore Library & Assignments |
| PATCH /assignments/:id/parent-pause | Parent — Chore Library & Assignments |
| PATCH /assignments/:id/assign | Parent — Chore Library & Assignments (Unassigned Pool) |
| PATCH /assignments/:id/unassign | Parent — Chore Library & Assignments |
| GET /assignments/:id/comments | CommentThread (child My Chores + parent Dashboard) |
| POST /assignments/:id/comments | CommentThread (child My Chores + parent Dashboard) |

### Rewards

| Endpoint | Consumer |
| --- | --- |
| GET /rewards | Child — Rewards; Parent — Reward Management |
| GET /rewards/refund-requests | Parent — Reward Management (Refunds section) |
| GET /rewards/:id | Uncovered (Reward Detail retired; detail actions inline in ParentRewardsTab) |
| POST /rewards | Child — Rewards (RewardRequestForm); Parent — Reward Management |
| PATCH /rewards/:id | Parent — Reward Management (edit) |
| PATCH /rewards/:id/approve | Parent — Reward Management (pending queue) |
| PATCH /rewards/:id/reject | Parent — Reward Management (pending queue) |
| PATCH /rewards/:id/cancel | Parent — Reward Management (active rewards) |
| PATCH /rewards/:id/archive | Parent — Reward Management (redeemed rewards) |
| POST /rewards/:id/contribute | Child — Rewards (RewardCard) |
| GET /rewards/:id/progress | Uncovered (deferred to mobile client for per-child breakdown) |
| POST /rewards/:id/redeem | Parent — Reward Management (funded queue) |
| PATCH /rewards/:id/request-refund | Child — Rewards (RewardCard) |
| PATCH /rewards/:id/approve-refund/:childId | Parent — Reward Management (refund queue) |
| PATCH /rewards/:id/reject-refund/:childId | Parent — Reward Management (refund queue) |

### Transactions

| Endpoint | Consumer |
| --- | --- |
| GET /transactions/ | Parent — History |
| GET /transactions/mine | Child — History |
| GET /transactions/:id | Parent — History (per-child drill-down) |

### Dashboard

| Endpoint | Consumer |
| --- | --- |
| GET /dashboard/child | Child — My Chores (primary data load) |
| GET /dashboard/parent | Parent — Dashboard (primary data load) |

### System

| Endpoint | Consumer |
| --- | --- |
| GET /health | ReconnectingBanner (periodic health polling) |

---

## Kiosk UX Requirements

Thor runs on a touchscreen in **landscape orientation** — these are non-negotiable design constraints:

- **Landscape-first layout** — all screens designed for wide/short viewport; no portrait fallback needed
- **No hover states** — all interactions must work on touch only
- **Minimum 48px tap targets** on all interactive elements
- **No physical keyboard required** — all text input is handled by the in-app virtual keyboard (`react-simple-keyboard`); PIN entry uses PinPad; emoji selection uses EmojiPicker (no keyboard needed). Physical keyboard remains fully functional when present.
- **Auto-logout after 5 minutes of inactivity** → returns to profile selection screen
- **ReconnectingBanner** — displayed when the API is unreachable; disappears when connection restores
- **Pull-to-refresh or auto-refresh on interval** — kiosk is always on, data must stay fresh
- **No browser chrome** — runs in Chromium kiosk mode, so no back button, no address bar
- **Per-user PIN lockout countdown** — on a 429 response, the locked profile tile is disabled and shows a 30-second countdown; all other profiles remain interactive; lockout state is frontend-only (not persisted to DB)
- The app must be fully functional without any external internet access (everything is on the LAN)

---

## Session Behavior

| Context | Session TTL |
| --- | --- |
| Kiosk (touchscreen) | 5-minute inactivity timeout → auto-logout to profile selector |

The frontend is responsible for tracking inactivity and calling `/auth/logout` when the timeout triggers. Mobile session TTL is handled by the mobile client, not Thor.

---

## Mobile Strategy

Mobile access is handled by a separate native app. Thor is designed for kiosk and desktop browser use.

---

## Repository and Build

Thor lives in its own repo (`thor`). It can be built locally or via CI (e.g., GitHub Actions) on every push to `main`. The built `dist/` folder contains static files that can be served by any web server or reverse proxy — no Node.js runtime needed in production.

```
Push to thor repo
    → CI: npm run build
    → commits dist/ back to repo
    → Production server pulls updated files
    → Web server serves updated static files immediately
```

---

## Architecture Decisions

### ADR-008: Mobile Client (React Native) — PWA Superseded

PWA was the original mobile strategy. Superseded by a dedicated mobile client (Expo/React Native). PWA push notification support on Android is limited; a native app gives full FCM push support, proper Android integration, and a dedicated UX without compromise. Thor remains kiosk-only; the mobile client is a separate project.

### ADR-010: TanStack Query for Server State

TanStack Query over plain React Context or SWR. The app is multi-user — one person's action affects another's view, requiring cache invalidation across components. TanStack Query handles caching, background refetching, and optimistic updates. React Context manages local-only state (current user, theme). Redux/Zustand add global state management but don't solve server state caching.

### ADR-011: PIN Lockout Handled in Frontend Only

On a 429 (rate limit) response from Odin, the UI disables the locked profile tile and displays a per-user countdown timer. Lockout events are not persisted to the database — there is no value in a login failure audit log for a family app, and the added complexity is not justified. The in-memory rate limiter on Odin is the source of truth; the frontend countdown is purely cosmetic UX.

### ADR-012: Modals Over Inline Accordion Expansion

Secondary content (forms, comment threads, detail views) is presented in centered modal overlays (`fixed inset-0 z-50`) rather than inline accordion expansion within cards. Inline expansion in a grid layout causes jarring layout shifts and is inconsistent on a kiosk touchscreen. Modals give a focused, consistent interaction surface with a clear dismiss target (backdrop tap or ✕ button). This applies to: CommentThread, ChoreForm, and any future detail or edit flows attached to cards.

### ADR-013: In-App Virtual Keyboard for Kiosk Text Input

The kiosk touchscreen has no physical keyboard. All text input (chore titles, names, comments, PINs, reward requests) must be achievable by touch.

Options considered:

- **Native on-screen keyboard** (OS-level): unreliable in Chromium kiosk mode; hard to style; may not appear for all input types.
- **Custom virtual keyboard via `react-simple-keyboard`**: renders inside the React app, fully styled, always present when needed.

Decision: `react-simple-keyboard`. The keyboard is managed globally via `KboardContext` and rendered as a fixed overlay at the root of the app (`z-[200]`). It activates on touch devices only — `isTouchDevice` is evaluated at module load time so physical keyboards on desktops continue to work normally.

Key implementation details:

- `useKboard(value, setter, options)` hook wraps any `<input>` or `<textarea>` with `onFocus`, `onBlur`, and `onChange` handlers. Spread onto the element with `{...kbHook}`.
- `register(value, setter, mode)` — called on focus; hands the keyboard a setter to push values into.
- `unregister()` — called on blur with a 200ms debounce so focus-switching between fields doesn't flicker the keyboard.
- `syncValue(val)` — called from `onChange` (physical keyboard) to keep the virtual keyboard's internal buffer in sync.
- When switching fields while the keyboard is already open, `register()` calls `keyboardRef.current.setInput(value)` immediately to reset the buffer; the `keyboardRef` callback only fires on mount, not on re-render.
- Ghost click fix: tapping the "Done ✓" key calls `dismiss()`, which hides the keyboard immediately and renders a transparent full-screen shield at `z-[150]` for 200ms to absorb the synthesized ghost click before it reaches modal backdrops at `z-50`.

PIN entry still uses PinPad (digit grid), not VirtualKeyboard. Emoji selection uses EmojiPicker (curated grid), not VirtualKeyboard.

### Repo Split Decision

Thor lives in its own dedicated repo (separate from Odin). Frontend and backend can be deployed independently. No logic needed to detect which part of the codebase changed — each repo deploys on its own.

---

## Next Session — Attack Order

### Completed

1. **5-Minute Inactivity Auto-Logout** — `useIdleTimer` hook listens for `touchstart`, `mousedown`, `keydown` on `document`; resets 5-minute `setTimeout`; on expiry calls `logout()` from AuthContext. Wired via `AuthenticatedShell` wrapper in `App.jsx`. No warning — hard cutoff.

2. **1024×600 Screen Fit** — ChoreTemplateCard restructured: row 1 = emoji + pts/cog, row 2 = title + truncated description, row 3 = schedule badges, row 4 = assign buttons. Info popup added for full chore details on tap.

3. **ReconnectingBanner** — `useOdinHealth` hook polls `GET /health` every 10s. Fixed amber banner at viewport top when disconnected. Suppresses false alarm on first check. Wired via `AuthenticatedShell`.

4. **Unassign to Pool** — `PATCH /assignments/:id/unassign` wired end-to-end. API function in `assignments.js`, "→ Pool" button in AssignmentRow (white/10 style, active for assigned/rejected/paused/parent_paused). Unassigned Pool panel height capped, button sizes increased for touch.

### Remaining

- Further 1024×600 viewport refinements if needed (header, dashboard, child views, modals)

---

## Future Enhancements (Frontend)

- **Push notifications** — alert children/parents when chores are approved, rejected, or assigned (requires PWA service worker + backend webhook/SSE)
- **Gamification UI** — leaderboard, streaks, weekly bonus display
- **Offline mode** — service worker caches dashboard data for display when Odin is unreachable
- **Cursor disable** — for touchscreen-only kiosk, hide the mouse cursor via CSS
- **Kiosk idle animation** — screensaver-style display cycling household stats when no one is logged in
- **Endpoint audit** — verify every Odin backend endpoint is utilized in the Thor frontend; cross-reference the API Coverage table against actual component/hook usage to identify any missed or orphaned endpoints
