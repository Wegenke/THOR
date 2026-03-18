# Odin — Backend Reference

This is the single reference document for the Odin backend. It covers the database schema, API, business logic, security model, and architecture decisions. For deployment alongside Odin, see the Odin repository.

---

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express |
| Query builder | Knex |
| Validation | Zod |
| Database | PostgreSQL |

Responsibilities:
- Business logic and state machine enforcement
- Authentication and session management
- Database interaction via Knex
- Input validation via Zod schemas
- Transaction safety for all point operations

---

## Database Schema

### households

Groups users into a family unit. Future-proofs multi-family support at near-zero cost.

| Field | Type | Notes |
|---|---|---|
| id | PK | Auto-increment |
| name | string | e.g., "Smith Family" |
| created_at | timestamp | Default now() |

---

### users

Stores both parents and children.

| Field | Type | Notes |
|---|---|---|
| id | PK | Auto-increment |
| household_id | FK | → households.id, NOT NULL |
| name | string | NOT NULL. Display name |
| nick_name | string | Nullable. Informal display name |
| avatar | jsonb | NOT NULL. DiceBear pixel-art options object e.g. `{"style":"pixel-art","seed":"Bart"}` |
| role | enum | 'parent' or 'child' |
| pin_hash | string | NOT NULL. bcrypt hash of PIN. Minimum 8 digits for parents, 4–8 for children |
| status | string | NOT NULL. Default 'active'. Soft delete support |
| token_version | integer | NOT NULL. Default 1. Incremented on PIN change or mobile logout — invalidates all outstanding JWTs for that user |
| pin_last_changed | timestamp | Nullable. Set when PIN is updated |
| points_balance | integer | Default 0. Only meaningful for children |
| created_at | timestamp | Default now() |

Status values: `active`, `inactive`, `removed`

Notes:
- `points_balance` is a cached value for fast lookup — **not** the source of truth
- `transactions` is the authoritative record of all point activity
- `avatar` is a jsonb object passed to DiceBear to render the user's pixel-art avatar. Used on the profile selection screen and throughout the UI
- Users are never deleted from the database — `status` is set to `inactive` or `removed` to preserve transaction and assignment history

---

### chores

Defines chore templates.

| Field | Type | Notes |
|---|---|---|
| id | PK | Auto-increment |
| household_id | FK | → households.id |
| title | string | e.g., "Clean room" |
| description | text | Nullable |
| emoji | string | NOT NULL. Emoji icon for the chore e.g. `"🍽️"`. Defaults to `"🦺"` if omitted |
| points | integer | Awarded on approval |
| created_by | FK | → users.id |
| created_at | timestamp | Default now() |

---

### chore_schedules

Defines recurring assignment rules. One row per chore per child. The daily scheduler checks this table and generates new assignments when the previous one reaches a terminal state.

Household scoping via JOIN to `chores` on `chore_schedules.chore_id = chores.id`.

| Field | Type | Notes |
|---|---|---|
| id | PK | Auto-increment |
| chore_id | FK | → chores.id, NOT NULL, CASCADE on delete |
| child_id | FK | → users.id, NOT NULL, RESTRICT on delete |
| frequency | string | NOT NULL. 'daily', 'weekly', or 'monthly' |
| day_of_week | integer | 0=Sun, 1=Mon, ..., 6=Sat. Required for weekly, null otherwise |
| day_of_month | integer | 1-28. Required for monthly, null otherwise |
| active | boolean | NOT NULL, default true. Scheduler skips inactive schedules |
| last_generated_at | timestamp | When the scheduler last created an assignment |
| created_at | timestamp | Default now() |

**Unique constraint:** `(chore_id, child_id)` — prevents duplicate schedules for the same chore and child.

---

### chore_assignments

Links chores to children with full status tracking.

`chore_assignments` has NO `household_id` column. Household scoping is done via JOIN to `chores` on `chore_assignments.chore_id = chores.id`.

| Field | Type | Notes |
|---|---|---|
| id | PK | Auto-increment |
| chore_id | FK | → chores.id, NOT NULL, CASCADE on delete |
| child_id | FK | → users.id. Nullable (unassigned) |
| status | string | See state machine below |
| assigned_at | timestamp | Default now() |
| started_at | timestamp | Nullable |
| paused_at | timestamp | Nullable |
| time_paused | integer | Default 0. Accumulated pause seconds |
| pause_count | integer | Default 0. Times paused by child |
| submitted_at | timestamp | Nullable. Set when child submits for review |
| reviewed_by | FK | → users.id. Nullable |
| reviewed_at | timestamp | Nullable |
| completed_at | timestamp | Nullable |

**Status values:** `assigned`, `in_progress`, `paused`, `parent_paused`, `submitted`, `rejected`, `approved`, `dismissed`, `canceled`, `unassigned`

**State machine (enforced in `assignmentService.js`):**

```
unassigned      → assigned       (child — claim; or parent — reassign)
unassigned      → canceled       (parent — cancel)
assigned        → in_progress    (child — start)
assigned        → submitted      (child — submit, optional comment)
assigned        → canceled       (parent — cancel)
assigned        → dismissed      (parent — dismiss)
assigned        → reassigned     (parent — reassign; resets to assigned for new child)
in_progress     → submitted      (child — submit, optional comment)
in_progress     → paused         (child — pause, optional comment)
in_progress     → parent_paused  (parent — parent-pause, optional comment)
in_progress     → dismissed      (parent — dismiss)
paused          → in_progress    (child — resume; accumulates time_paused)
paused          → submitted      (child — submit)
paused          → dismissed      (parent — dismiss)
parent_paused   → in_progress    (child — resume; does NOT accumulate time_paused)
submitted       → approved       (parent — approve; awards points via transaction)
submitted       → rejected       (parent — reject, required comment)
rejected        → in_progress    (child — resume-rejected; preserves started_at and pause data)
rejected        → dismissed      (parent — dismiss)
```

Any invalid transition returns 400. The service checks both current status and requesting user's role before applying any transition.

---

### user_devices

Stores FCM push tokens per device. One row per device — a user with both a phone and a tablet gets two rows. Used to fan out push notifications to all of a user's devices.

| Field | Type | Notes |
|---|---|---|
| id | PK | Auto-increment |
| user_id | FK | → users.id, NOT NULL, CASCADE on delete |
| device_token | string | NOT NULL. FCM registration token |
| platform | string | NOT NULL. Default 'android'. Future-proofs iOS |
| label | string | Nullable. e.g., 'Phone', 'Tablet' |
| last_seen_at | timestamp | Nullable. Updated on each app open |
| created_at | timestamp | Default now() |

Registration is an upsert: if the token already exists for this user, update `last_seen_at`; if new, insert. Old/rotated tokens are replaced when the device re-registers.

---

### assignment_comments

Feedback and notes on assignments.

| Field | Type | Notes |
|---|---|---|
| id | PK | Auto-increment |
| assignment_id | FK | → chore_assignments.id, CASCADE on delete |
| user_id | FK | → users.id |
| comment | string | Max 500 characters |
| created_at | timestamp | Default now() |

Notes:
- Required when parent rejects a submission
- Optional for other transitions
- Children can also comment (e.g., "I couldn't find the cleaning spray")

---

### rewards

Items or activities children want to earn.

| Field | Type | Notes |
|---|---|---|
| id | PK | Auto-increment |
| household_id | FK | → households.id |
| created_by | FK | → users.id |
| name | string | e.g., "Lego set" |
| description | text | Nullable |
| link | string | Nullable. URL to product |
| points_required | integer | Nullable. Set by parent on approval |
| is_shared | boolean | Default false. Multiple children can contribute |
| status | string | Default 'pending'. See lifecycle below |
| created_at | timestamp | Default now() |

**Status lifecycle:**

```
pending  → active    (parent approves, sets points_required)
pending  → archived  (parent rejects)
active   → funded    (automatic when contributions reach points_required)
active   → archived  (parent cancels; auto-refunds all contributions)
funded   → redeemed  (parent confirms)
redeemed → archived  (parent archives after fulfillment)
```

Any user (parent or child) can create a reward request. It starts as `pending` until a parent approves it.

---

### reward_contributions

Tracks points contributed to rewards.

| Field | Type | Notes |
|---|---|---|
| id | PK | Auto-increment |
| reward_id | FK | → rewards.id, CASCADE on delete |
| child_id | FK | → users.id |
| points | integer | Clamped on insert |
| refund_requested | boolean | Default false. Set by child to request refund |
| created_at | timestamp | Default now() |

Clamping rule: `actual = min(requested, remaining_on_reward, child_balance)`

If actual is 0 (reward fully funded or child has no balance), request is rejected — a zero-point record is never inserted.

---

### transactions

Ledger of all point activity. This is the source of truth for point history.

| Field | Type | Notes |
|---|---|---|
| id | PK | Auto-increment |
| child_id | FK | → users.id |
| amount | integer | Positive = earned, Negative = spent |
| source | string | See source values below |
| reference_id | integer | ID of related record |
| created_at | timestamp | Default now() |

| Source | Amount | Reference |
|---|---|---|
| chore_approved | + | chore_assignments.id |
| reward_contribution | - | rewards.id |
| reward_refund | + | rewards.id |
| reward_redemption | - | rewards.id |
| manual_adjustment | +/- | null or users.id |

---

## Business Logic

### Reward Contribution Transaction Steps

Points must never be duplicated, lost, over-contributed, or spent beyond a child's available balance. A database transaction with row-level locking guarantees this.

1. Begin transaction
2. Lock reward row: `SELECT * FROM rewards WHERE id = ? FOR UPDATE`
3. Verify reward status is `active` — abort if not
4. Calculate current contributions: `SELECT COALESCE(SUM(points), 0) FROM reward_contributions WHERE reward_id = ?`
5. Determine remaining: `remaining = points_required - contributed_total`
6. Lock child row: `SELECT points_balance FROM users WHERE id = ? FOR UPDATE`
7. Clamp: `actual = min(requested, remaining, child_balance)`
8. If actual is 0, rollback with appropriate error
9. Insert contribution record
10. Insert transaction record (`amount = -actual`, `source = 'reward_contribution'`)
11. Update `users.points_balance -= actual`
12. If `contributed_total + actual >= points_required`: set reward status to `funded`
13. Commit

**Why locking matters:** Without `FOR UPDATE`, two simultaneous requests could both read the same remaining balance and both contribute, resulting in over-contribution. Row locking serializes concurrent requests.

### Refund Logic

- Child flags all their contributions on a reward: `refund_requested = true`
- Parent approves: all flagged contribution rows deleted, points returned, single `reward_refund` transaction inserted
- If refund drops a `funded` reward below `points_required`, reward reverts to `active`
- Parent rejects: `refund_requested` reset to `false`, no transaction inserted
- When parent cancels a reward (`active → archived`): all contributions from all children auto-refunded without child request

### Chore Approval Points Award

1. Begin transaction
2. Verify assignment status is `submitted`
3. Update assignment: `status = 'approved'`, set `reviewed_by`, `reviewed_at`
4. Look up chore `points` value
5. Insert transaction (`amount = +points`, `source = 'chore_approved'`)
6. Update `users.points_balance += points`
7. Commit

---

## API Structure

```
backend/src/
  controllers/          — HTTP request/response only, no business logic
  services/             — business logic, DB queries, state machine enforcement
  middleware/
    auth.js             — validates session, returns 401 if not authenticated
    roleCheck.js        — roleCheck('parent') checks req.session.user.role, returns 403
    validate.js         — validates req.body against Zod schema, returns 400
    validateQuery.js    — validates req.query against Zod schema, returns 400
  routes/               — wires middleware chain: auth → roleCheck → validate → controller
  validators/           — Zod schemas for all route inputs
  db/
    migrations/
    seeds/
```

Route middleware chain: `auth` → `roleCheck` → `validate` / `validateQuery` → controller

Controllers are thin: parse params/body, call service, return response with correct status code. All business logic lives in services.

---

## API Endpoints

### Authentication

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /auth/profiles | No | Returns id, name, avatar, role only — never pin_hash |
| POST | /auth/login | No | Accepts user id + PIN. Rate-limited per user. Returns `{ user, token }` |
| POST | /auth/logout | Yes | Destroys session only. Does not affect JWT tokens |
| POST | /auth/logout/mobile | Yes | Increments token_version, invalidating all JWTs for this user. Does not touch sessions |
| GET | /auth/session | Yes | Returns current session info |

Rate limiting: 3 failed attempts → 30-second lockout per profile (not global).

---

### Users

| Method | Path | Auth | Role | Notes |
|---|---|---|---|---|
| GET | /users | Yes | parent | List all household users |
| POST | /users | Yes | parent | Create a new user in the household |
| GET | /users/pin_changes | Yes | parent | Users who changed PIN in last 5 days |
| PATCH | /users/me | Yes | any | Update own nick_name, avatar, or PIN |
| GET | /users/:id | Yes | any | Get user details |
| PATCH | /users/:id | Yes | parent | Update name, nick_name, avatar, role, or PIN |

---

### Chores

| Method | Path | Auth | Role | Notes |
|---|---|---|---|---|
| GET | /chores | Yes | any | List chore templates |
| POST | /chores | Yes | parent | Create a new chore template |
| PATCH | /chores/:id | Yes | parent | Update title, points, description, or emoji |

---

### Schedules

| Method | Path | Auth | Role | Notes |
|---|---|---|---|---|
| POST | /schedules | Yes | parent | Create a recurring schedule (+ first assignment). 409 if duplicate |
| GET | /schedules | Yes | parent | List all schedules for the household |
| GET | /schedules/chore/:chore_id | Yes | parent | List schedules for a specific chore |
| PATCH | /schedules/:id | Yes | parent | Update frequency, day, or active status |
| DELETE | /schedules/:id | Yes | parent | Remove a schedule. Existing assignments continue normally |

**Scheduler:** Runs daily at 3:00am via `node-cron` inside Odin. For each active schedule, checks if today matches the frequency/day and if the most recent assignment for that (chore_id, child_id) pair is in a terminal state (approved, dismissed, canceled). If both conditions are met, creates a new assignment.

---

### Assignments

| Method | Path | Auth | Role | Notes |
|---|---|---|---|---|
| GET | /assignments | Yes | parent | List all assignments |
| GET | /assignments/mine | Yes | child | Assignments for the logged-in child |
| POST | /assignments | Yes | parent | Assign a chore (child_id optional — creates unassigned) |
| PATCH | /assignments/pause-all-active | Yes | parent | Parent-pause all in_progress assignments |
| GET | /assignments/available | Yes | child | List unassigned assignments available to claim |
| PATCH | /assignments/:id/claim | Yes | child | Claim an unassigned assignment (race-safe with FOR UPDATE) |
| PATCH | /assignments/:id/start | Yes | child | Start an assigned assignment |
| PATCH | /assignments/:id/submit | Yes | child | Submit for review, optional comment |
| PATCH | /assignments/:id/pause | Yes | child | Pause in_progress |
| PATCH | /assignments/:id/resume | Yes | child | Resume paused or parent_paused |
| PATCH | /assignments/:id/resume-rejected | Yes | child | Resume after rejection (preserves started_at) |
| PATCH | /assignments/:id/approve | Yes | parent | Approve, award points via transaction |
| PATCH | /assignments/:id/reject | Yes | parent | Reject submitted, requires comment |
| PATCH | /assignments/:id/dismiss | Yes | parent | Dismiss without awarding points |
| PATCH | /assignments/:id/cancel | Yes | parent | Cancel an unassigned, assigned, or rejected assignment |
| PATCH | /assignments/:id/reassign | Yes | parent | Reassign to a different child |
| PATCH | /assignments/:id/parent-pause | Yes | parent | Parent-pause a single in_progress assignment |
| PATCH | /assignments/:id/assign | Yes | parent | Assign an unassigned task to a child |
| PATCH | /assignments/:id/unassign | Yes | parent | Return an assigned/rejected/paused task to the unassigned pool |
| GET | /assignments/:id/comments | Yes | any | Get comments for an assignment |
| POST | /assignments/:id/comments | Yes | any | Add a comment to an assignment |

---

### Rewards

| Method | Path | Auth | Role | Notes |
|---|---|---|---|---|
| GET | /rewards | Yes | any | List all rewards |
| GET | /rewards/:id | Yes | any | Get reward details |
| POST | /rewards | Yes | any | Create reward request (starts as pending) |
| PATCH | /rewards/:id | Yes | parent | Update reward details |
| PATCH | /rewards/:id/approve | Yes | parent | Approve pending reward, set points_required |
| PATCH | /rewards/:id/reject | Yes | parent | Reject pending reward (→ archived) |
| PATCH | /rewards/:id/cancel | Yes | parent | Cancel active reward, auto-refund |
| PATCH | /rewards/:id/archive | Yes | parent | Archive redeemed reward |
| POST | /rewards/:id/contribute | Yes | child | Contribute points (clamped) |
| GET | /rewards/:id/progress | Yes | any | Contribution breakdown |
| POST | /rewards/:id/redeem | Yes | parent | Mark funded reward as redeemed |
| PATCH | /rewards/:id/request-refund | Yes | child | Flag all own contributions for refund |
| PATCH | /rewards/:id/approve-refund/:childId | Yes | parent | Approve refund, return points |
| PATCH | /rewards/:id/reject-refund/:childId | Yes | parent | Reject refund request, reset flags |

---

### Transactions

| Method | Path | Auth | Role | Notes |
|---|---|---|---|---|
| GET | /transactions/ | Yes | parent | All household transactions, paginated |
| GET | /transactions/mine | Yes | child | Logged-in child's transactions, paginated |
| GET | /transactions/:id | Yes | parent | All transactions for a specific child, paginated |

Query params (all optional): `page`, `limit`, `source`
Valid source values: `chore_approved`, `reward_contribution`, `reward_refund`

Response shape:
```json
{
  "data": [...],
  "pagination": { "total": 42, "page": 1, "limit": 20, "totalPages": 3 }
}
```

Refund state not visible through the transaction layer:
- Pending refund: `reward_contributions.refund_requested = true`
- Approved refund: `transactions` row with `source = 'reward_refund'`
- Rejected refund: `refund_requested` reset to `false`, no transaction row

---

### Dashboard

| Method | Path | Auth | Role | Notes |
|---|---|---|---|---|
| GET | /dashboard/child | Yes | child | Chores, balance, reward progress (session-based) |
| GET | /dashboard/parent | Yes | parent | Pending approvals, children summaries |

Aggregated endpoints to reduce frontend round-trips. One call returns everything needed to render a dashboard screen.

---

### Setup

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /setup | No | Returns `{ complete: true/false }` based on whether a parent user exists |
| POST | /setup | No | First-time setup: creates household + first parent user. Validated via Zod. Returns 403 if setup already complete |

POST body:

```json
{
  "household": { "name": "Family Name" },
  "user": { "name": "Parent Name", "nick_name": "Nick", "avatar": { "style": "pixel-art", "seed": "Homer" }, "pin": "1234" }
}
```

---

### System

| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | /health | No | Health check — returns `{status, db}`. 503 if DB unreachable |

---

## Security Model

**Authentication:** PIN-based login. PINs stored as bcrypt hashes. Profile list is unauthenticated but returns only `id`, `name`, `avatar`, `role` — never `pin_hash`. `avatar` is the jsonb DiceBear options object.

**Sessions:** `express-session` with `connect-pg-simple` PostgreSQL session store. Sessions persisted to the `session` table — survive restarts. `maxAge` set to 30 days. `household_id` and `id` always sourced from `req.session.user`, never from request body or params.

**JWT (mobile):** `jsonwebtoken` (HS256). Login returns a 30-day signed token containing `{ id, household_id, role, name, nick_name, avatar, status, token_version }`. The `auth` middleware accepts either a valid session or a `Authorization: Bearer <token>` header — on valid JWT it populates `req.session.user` from the payload so all downstream middleware and controllers are unchanged. On JWT auth, the middleware does a single DB lookup to verify `token_version` matches the current value in `users` — mismatches return 401. `token_version` is incremented on PIN change or intentional mobile logout (`POST /auth/logout/mobile`), immediately invalidating all outstanding tokens for that user. Thor logout never touches `token_version`, so mobile sessions survive kiosk logouts and timeouts.

**Rate limiting:** Per-user lockout — 3 failed login attempts → 30-second cooldown per profile. Not global (one child's mistakes don't lock out parents). Implemented via `express-rate-limit` keyed on `user_id`, with `skipSuccessfulRequests: true`.

**PIN length policy:** Parents require a minimum 8-digit PIN (enforced in validation middleware). Children use 4–8 digits. Parent accounts are the only ones exposed to internet-facing auth when DuckDNS is enabled — longer PINs are the primary brute-force mitigation. Note: existing parent PINs shorter than 8 digits must be updated when this policy is deployed.

**Household scoping:** Every query is filtered by `household_id` from the session. `chore_assignments` has no `household_id` column — scoping goes through a JOIN to `chores`: `.join('chores', 'chore_assignments.chore_id', 'chores.id').where({'chores.household_id': household_id})`.

**Validation:** Zod schemas on all route inputs via middleware. Runs before controllers on every route.

**Hardening (in place):**
- `helmet` middleware — active, sets security headers
- `cors({ origin: CLIENT_URL, credentials: true })` — restricts to known frontend origin
- `cookie.httpOnly: true` — prevents JS from reading session cookie
- `cookie.sameSite: 'lax'` — blocks cross-origin POST/PATCH/DELETE with session cookie
- `morgan('combined')` — HTTP request logging to journalctl
- Graceful shutdown on `SIGTERM` — allows in-flight requests to complete before process exit

**Production hardening (pending):**
- `cookie.secure: true` — enable when HTTPS is in place (Caddy migration)

---

## Architecture Decisions

### ADR-002: PIN-Based Authentication

PIN login over password/OAuth. Primary users are children on a touchscreen kiosk — PINs are fast, low friction, and appropriate for a household-only app. Mitigated by bcrypt hashing and per-user rate limiting.

### ADR-003: Points Balance Caching

`points_balance` stored on `users` as a cached value. Eliminates expensive SUM queries on the transactions table for every dashboard load. Trade-off: balance must be updated atomically within every point-affecting transaction. Transactions table remains source of truth.

### ADR-004: Clamping Over Rejection

When a contribution exceeds what's allowed, clamp to the maximum valid amount instead of rejecting. Better UX for children who may not know the exact remaining amount. Exception: if clamping would result in 0, reject with a clear error.

### ADR-005: Knex Over Raw SQL or ORM

Knex provides migration/seed management and an expressive query builder without hiding SQL intent. Lighter than a full ORM (Sequelize, TypeORM). Maintains explicit control over transactions and locking. Raw SQL has no migration management; Prisma is heavier with less transaction control.

### ADR-006: Explicit State Machine for Chore Assignments

Explicit state machine enforced in `assignmentService.js`. Prevents invalid transitions, makes role-based access auditable, and documents business rules in a single place. Open-ended status fields with role middleware only are too easy to misuse.

### ADR-008: JWT Auth + Token Versioning

JWT added as a parallel auth method for the mobile client. Sessions/cookies are unreliable in React Native; JWT in SecureStore is the standard mobile pattern. Sessions remain the auth mechanism for Thor — no migration needed.

Single long-lived token (30 days, HS256) rather than access + refresh token pair. The app is household-internal; short-lived tokens add complexity with no meaningful security benefit at this scale.

Token revocation via `token_version` column on `users` rather than a token blacklist. Blacklists require storage and lookups that grow unbounded; version checking is a single indexed primary-key lookup per request. Version is incremented on PIN change or intentional mobile logout — both represent a deliberate "sign out everywhere" intent.

Thor logout deliberately does not increment `token_version`. Thor auto-logs out on inactivity; invalidating mobile tokens on every kiosk timeout would be a poor UX. The two clients have independent session lifecycles.

### ADR-007: Household Entity

`households` table added even though the app initially supports one family. Costs almost nothing, avoids a painful retrofit if multi-family support is ever needed, and keeps all data properly scoped from day one.

---

## Future Enhancements (Backend)

- **Manual point adjustments** — parent endpoint to add/subtract points directly with a `manual_adjustment` transaction
- **Push notifications** — webhook or SSE endpoint for real-time chore approval/rejection alerts
- **Leaderboards / streaks** — aggregation queries for gamification layer
- **MFA for parent accounts** — optional second factor
- **Session TTL by context** — kiosk (15min inactivity), mobile (longer, configurable)
