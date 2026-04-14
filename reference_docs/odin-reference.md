# Odin API Reference — Thor Frontend

API reference for all Odin endpoints used by Thor. Covers request/response shapes, query parameters, and behavioral notes relevant to frontend development.

For full backend documentation (database schema, business logic, architecture decisions), see the Odin repository.

**Base URL:** Set via `VITE_API_URL` environment variable. Dev: `/api` (proxied to `localhost:8080`). Production: `/odin` (or whatever path your reverse proxy uses).

**Auth:** All requests (except profiles, login, setup, and health) require an authenticated session. Axios is configured with `credentials: 'include'` to send the session cookie automatically.

---

## Authentication

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | /auth/profiles | — | Returns `[{ id, name, nick_name, avatar, role }]`. Never exposes `pin_hash` |
| POST | /auth/login | `{ user_id, pin }` | Sets session cookie. Returns `{ user }`. Rate-limited: 3 failures → 30s lockout per profile (429 response) |
| POST | /auth/logout | — | Destroys session cookie |
| GET | /auth/session | — | Returns current session user or 401 if not authenticated. Used to restore session on page reload |

**Rate limiting:** The 429 response triggers the per-profile lockout UI (LockoutTimer). Lockout is per-user, not global — one child's failed attempts don't affect other profiles.

---

## Users

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | /users | — | All household users. Parent-only |
| POST | /users | `{ name, nick_name, avatar, role, pin }` | Create user. Parent-only |
| GET | /users/pin_changes | — | Users who changed PIN in last 5 days. Parent-only |
| PATCH | /users/me | `{ nick_name?, avatar?, pin? }` | Update own profile. Any role |
| PATCH | /users/:id | `{ name?, nick_name?, avatar?, role?, pin? }` | Update any user. Parent-only |
| DELETE | /users/:id | — | Deactivate user (soft delete). Parent-only |

**Avatar format:** `avatar` is a jsonb object passed to DiceBear for pixel-art rendering, e.g. `{ "style": "pixel-art", "seed": "Bart", "hair": "short04" }`.

---

## Chores

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | /chores | — | All chore templates for the household |
| POST | /chores | `{ title, description?, emoji?, points }` | Create chore. Parent-only. `emoji` defaults to `"🦺"` if omitted |
| PATCH | /chores/:id | `{ title?, description?, emoji?, points? }` | Update chore. Parent-only |

---

## Schedules

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | /schedules | — | All schedules for the household. Parent-only |
| GET | /schedules/chore/:chore_id | — | Schedules for a specific chore. Parent-only |
| POST | /schedules | `{ chore_id, child_id, frequency, day_of_week?, day_of_month? }` | Create schedule + first assignment. 409 if duplicate. Parent-only |
| PATCH | /schedules/:id | `{ frequency?, day_of_week?, day_of_month?, active? }` | Update schedule. Parent-only |
| DELETE | /schedules/:id | — | Remove schedule. Existing assignments continue. Parent-only |

**Frequency values:** `daily`, `weekly`, `monthly`. `day_of_week` required for weekly (0=Sun–6=Sat). `day_of_month` required for monthly (1–28).

---

## Assignments

### State Transitions (Child)

| Method | Path | Body | Notes |
|---|---|---|---|
| PATCH | /assignments/:id/start | `{ comment? }` | assigned → in_progress |
| PATCH | /assignments/:id/submit | `{ comment? }` | assigned/in_progress/paused → submitted |
| PATCH | /assignments/:id/pause | `{ comment? }` | in_progress → paused |
| PATCH | /assignments/:id/resume | `{ comment? }` | paused/parent_paused → in_progress |
| PATCH | /assignments/:id/resume-rejected | `{ comment? }` | rejected → in_progress (preserves started_at and pause data) |
| PATCH | /assignments/:id/claim | — | unassigned → assigned (race-safe) |

### State Transitions (Parent)

| Method | Path | Body | Notes |
|---|---|---|---|
| PATCH | /assignments/:id/approve | — | submitted → approved. Awards points |
| PATCH | /assignments/:id/reject | `{ comment }` | submitted → rejected. Comment required |
| PATCH | /assignments/:id/dismiss | `{ comment? }` | assigned/in_progress/paused/rejected → dismissed |
| PATCH | /assignments/:id/cancel | `{ comment? }` | unassigned/assigned/rejected → canceled |
| PATCH | /assignments/:id/reassign | `{ child_id, comment? }` | Reassign to different child |
| PATCH | /assignments/:id/assign | `{ child_id }` | unassigned → assigned to specific child |
| PATCH | /assignments/:id/unassign | — | assigned/rejected/paused → unassigned pool |
| PATCH | /assignments/:id/parent-start | — | Start on behalf of child |
| PATCH | /assignments/:id/parent-pause | `{ comment? }` | in_progress → parent_paused |
| PATCH | /assignments/:id/unstart | — | in_progress/paused/parent_paused → assigned. Clears progress fields except assigned_at |
| PATCH | /assignments/pause-all-active | `{ comment? }` | Parent-pause all in_progress assignments household-wide |

### Queries

| Method | Path | Params | Notes |
|---|---|---|---|
| GET | /assignments | — | All assignments. Parent-only |
| GET | /assignments/available | — | Unassigned assignments available to claim. Child-only |
| GET | /assignments/missed | `page`, `limit`, `child_id` | Missed chores (dismissed + never started). Parent-only. Paginated |
| POST | /assignments | `{ chore_id, child_id? }` | Create assignment. `child_id` omitted → unassigned. Parent-only |

### Comments

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | /assignments/:id/comments | — | All comments for an assignment |
| POST | /assignments/:id/comments | `{ comment }` | Add comment. Any role. Auto-dismisses overdue `assigned` chores |

**Assignment status values:** `unassigned`, `assigned`, `in_progress`, `paused`, `parent_paused`, `submitted`, `rejected`, `approved`, `dismissed`, `canceled`

**Terminal states:** `approved`, `dismissed`, `canceled` — no further transitions possible.

---

## Rewards

### Lifecycle (Parent)

| Method | Path | Body | Notes |
|---|---|---|---|
| PATCH | /rewards/:id/approve | `{ points_required }` | pending → active. Must be multiple of 10 |
| PATCH | /rewards/:id/reject | — | pending → archived |
| PATCH | /rewards/:id/cancel | — | active → archived. Auto-refunds all contributions |
| POST | /rewards/:id/redeem | — | funded → redeemed |
| PATCH | /rewards/:id/archive | — | redeemed → archived |
| PATCH | /rewards/:id/approve-refund/:childId | — | Approve refund, return points. May revert funded → active |
| PATCH | /rewards/:id/reject-refund/:childId | — | Reject refund, reset flags |

### Child Actions

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | /rewards/:id/contribute | `{ points }` | Contribute points. Clamped to min(requested, remaining, balance). Zero = rejected |
| PATCH | /rewards/:id/request-refund | — | Flag all own contributions for refund |

### Queries

| Method | Path | Params | Notes |
|---|---|---|---|
| GET | /rewards | `sort` | All rewards. `sort=progress` for parent view |
| GET | /rewards/refund-requests | — | Pending refund requests grouped by reward + child. Parent-only |
| POST | /rewards | `{ name, description?, link?, is_shared? }` | Create reward request (starts as pending). Any role |
| PATCH | /rewards/:id | `{ name?, description?, link?, points_required? }` | Update reward. Parent-only |

**Reward status lifecycle:** `pending → active → funded → redeemed → archived`. Parent can also: `pending → archived` (reject), `active → archived` (cancel + auto-refund).

**Clamping:** Contributions are silently clamped to `min(requested, remaining_on_reward, child_balance)`. If clamping results in 0, the request is rejected with an error.

---

## Transactions

| Method | Path | Params | Notes |
|---|---|---|---|
| GET | /transactions/ | `page`, `limit`, `source` | All household transactions. Parent-only |
| GET | /transactions/mine | `page`, `limit`, `source` | Logged-in child's transactions. Child-only |
| GET | /transactions/:childId | `page`, `limit`, `source` | Transactions for a specific child. Parent-only |

**Source filter values:** `chore_approved`, `reward_contribution`, `reward_refund`, `reward_redemption`, `manual_adjustment`

**Paginated response shape:**

```json
{
  "data": [...],
  "pagination": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
}
```

---

## Dashboard

| Method | Path | Notes |
|---|---|---|
| GET | /dashboard/child | Active chores, balance, reward progress. Child-only |
| GET | /dashboard/child/summary | Missed chores, recently completed, reward info. Child-only |
| GET | /dashboard/child/:child_id | View a child's dashboard as parent (read-only). Parent-only |
| GET | /dashboard/parent | Pending approvals, children summaries, household stats. Parent-only |

Aggregated endpoints — one call returns everything needed to render a dashboard screen. Minimizes round-trips.

---

## Parent Tasks

Parent-only to-do list. Not visible to children.

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | /parent-tasks | — | Active and in_progress tasks (sorted by sort_order) |
| GET | /parent-tasks/recent | — | Recently archived tasks |
| POST | /parent-tasks | `{ title }` | Create task |
| PATCH | /parent-tasks/:id | `{ title?, status? }` | Update task |
| PATCH | /parent-tasks/:id/start | — | active → in_progress |
| PATCH | /parent-tasks/:id/pause | — | in_progress → active |
| PATCH | /parent-tasks/:id/archive | — | → archived |
| PATCH | /parent-tasks/reorder | `{ ids }` | Array of task IDs in new sort order |
| GET | /parent-tasks/:id/notes | — | Notes for a task |
| POST | /parent-tasks/:id/notes | `{ content }` | Add note to a task |

---

## Point Adjustments

Parent-issued rewards and penalties with child notification.

| Method | Path | Body | Notes |
|---|---|---|---|
| POST | /adjustments | `{ child_id, points, reason }` | Create adjustment. Positive = reward, negative = penalty. Parent-only |
| GET | /adjustments/unseen | — | Unseen adjustments for login notification modal. Child-only |
| PATCH | /adjustments/seen | — | Mark all as seen. Child-only |

---

## Setup

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | /setup | — | Returns `{ complete: true/false }`. Unauthenticated |
| POST | /setup | See below | Create household + first parent. 403 if already complete. Unauthenticated |

**Setup body:**

```json
{
  "household": { "name": "Family Name" },
  "user": { "name": "Parent Name", "nick_name": "Nick", "avatar": { "style": "pixel-art", "seed": "Homer" }, "pin": "12345678" }
}
```

---

## System

| Method | Path | Notes |
|---|---|---|
| GET | /health | Returns `{ status, db }`. 503 if DB unreachable. Used by useOdinHealth hook |
