# Task evaluations — implementation audit (NIAT CBC)

This document summarizes **what exists today** for challenge submission upload and AI evaluation, **what is missing** relative to product goals (background processing, instant user acknowledgment, viewing submissions), and a **checklist** for implementers or LLMs picking up the work.

Scope: `niat-cbc` student dashboard flow, submission APIs, AI verification, admin tooling.

---

## 1. Product goals (from requirements)

| Goal | Intent |
|------|--------|
| **Background evaluation** | Users should not “wait on the page” for the AI verdict; evaluation should run **asynchronously** after upload succeeds. |
| **Instant feedback after upload** | As soon as the upload API succeeds, the user should see a **clear, immediate message** (e.g. “Received — we’re reviewing your proof”). |
| **View own submission** | Students should be able to **see the image they uploaded** (and ideally status/reason), not only a card state. |

---

## 2. Data model (`submissions` table)

Defined in `src/types/database.ts` and used across the app.

Relevant columns for evaluations:

| Column | Role |
|--------|------|
| `id` | UUID; used by `/api/submissions/status` and verify flow. |
| `student_id`, `task_id`, `bootcamp_id`, … | Scoping and joins. |
| `file_url` | Storage path in Supabase bucket `submissions` (not a public URL). |
| `status` | `not_started` \| `pending` \| `accepted` \| `rejected` |
| `points` | Set when `accepted` (from `CHALLENGES` points). |
| `ai_reason` | One-line explanation from Claude (accept/reject) or override. |
| `resubmit_count` | Incremented on each upload; **≥ 3** blocks further uploads. |

**Lifecycle (intended):**

- New students get **9 rows** (tasks 1–9), typically `not_started`, via `src/app/api/auth/verify-otp/route.ts` (bulk insert).
- Upload sets `status: "pending"`, writes `file_url`, increments `resubmit_count`.
- AI verify sets `accepted` or `rejected` (or on failure, may reset — see §5.3).

---

## 3. End-to-end flow (current implementation)

```
[Student] Mission modal → POST /api/submissions/upload
       → Supabase Storage upload
       → DB update: pending + file_url + resubmit_count
       → fire-and-forget POST /api/submissions/verify { submissionId }
       → JSON { success, data: { submissionId } } returned to client (no verdict)

[Background-ish] POST /api/submissions/verify
       → load image via signed URL
       → Anthropic Claude (vision) JSON verdict
       → DB update: accepted | rejected (+ ai_reason) OR not_started on error path

[Client] ChallengeBoard polls GET /api/submissions/status?submissionId=… every 4s while any submission is pending
       → merges status / points / aiReason into local state
       → XP toast only when status becomes accepted
```

**Important:** The upload handler does **not** wait for verification; it only triggers verify via `fetch(...).catch(() => {})`. That is a **lightweight** “background” trigger, not a durable job queue (see §6).

---

## 4. File map

| Area | Path | Role |
|------|------|------|
| Upload | `src/app/api/submissions/upload/route.ts` | Auth, validate file, storage upload, DB `pending`, trigger verify. |
| AI verify | `src/app/api/submissions/verify/route.ts` | Load image, call Anthropic, update DB. |
| Student status | `src/app/api/submissions/status/route.ts` | Cookie auth; returns `status`, `points`, `aiReason` for **own** submission. |
| Admin image | `src/app/api/admin/submissions/[id]/image/route.ts` | Signed URL for **admin** preview (JSON `{ signedUrl }`). **No student equivalent.** |
| Admin override | `src/app/api/admin/submissions/[id]/override/route.ts` | Manual accept/reject. |
| Admin unlock | `src/app/api/admin/submissions/[id]/unlock/route.ts` | Reset attempts. |
| Challenges copy | `src/lib/challenges.ts` | Titles/descriptions sent to the model. |
| Env | `src/lib/env.ts` | `ANTHROPIC_API_KEY` (and others). |
| Dashboard data | `src/app/dashboard/page.tsx` | Loads full `submissions` rows for student (includes `file_url`). |
| Board UI | `src/components/challenges/ChallengeBoard.tsx` | Polling, local state, modal, XP toast. |
| Modal upload | `src/components/challenges/MissionModal.tsx` | FormData upload; **no** dedicated success copy; closes via parent on success. |
| Cards | `src/components/challenges/ChallengeCard.tsx` | Status visuals; **does not** show `ai_reason` or thumbnail. |
| Legacy HUD | `src/components/student/ChallengeCard.tsx` | Older card; **does** show AI feedback on reject + VERIFYING copy (not used by main dashboard grid if that route uses the challenges components only). |

---

## 5. What is already implemented

### 5.1 Upload API

- Cookie session (`cbc_student`), task id 1–9, PNG/JPEG, size limit.
- Enforces `resubmit_count < 3`.
- Stores file under `/{bootcampId}/{studentId}/{taskId}-{timestamp}.{ext}`.
- Sets `pending` **before** returning; response is quick and does not include AI output.

### 5.2 “Background” trigger (not a full job system)

- After DB update, `upload/route.ts` runs:
  - `void fetch(\`${origin}/api/submissions/verify\`, { method: "POST", body: JSON.stringify({ submissionId }) })`
- This **does not block** the upload response.
- **Caveats:** On some serverless hosts, the **continuation** of the upload request may end before the nested `fetch` completes; the verify route may still run as a separate invocation, but there is **no retry**, **no queue**, and **no deduplication**. Failures are silent from the user’s perspective until polling shows stale `pending` or manual intervention.

### 5.3 Verify API (AI)

- Validates `submissionId` (UUID).
- Requires row `status === "pending"` and `file_url` set.
- Signed URL (60s) to read the image; base64 to Anthropic.
- Model: `claude-sonnet-4-20250514`; system prompt asks for JSON only: `{ verdict, reason }`.
- On success: updates `accepted` or `rejected` with `ai_reason`.
- On **JSON/parse/network failure** inside `try/catch`: sets status back to **`not_started`** (allows retry without counting as final verdict — but `resubmit_count` was already incremented on upload).

### 5.4 Client: polling and partial UX

- `ChallengeBoard` starts a **4s interval** when any local submission is `pending`.
- Calls `/api/submissions/status` per pending id; updates `status`, `points`, `ai_reason`.
- **XP toast** (`XPToast`) only when status flips to **`accepted`** (not for rejected).
- `MissionModal`: on HTTP success, calls `onSubmitSuccess(taskId)` immediately — parent sets task to `pending`, **closes modal**; **no** inline “upload received” success banner/toast in the modal.

### 5.5 What students can “see” today

- **Dashboard** loads `file_url` in the submission object from the server, but the **challenge UI** (`ChallengeCard` in `challenges/`) does **not** render the image or `ai_reason`.
- **Admins** can open submission images via `GET /api/admin/submissions/[id]/image` (signed URL).
- **Students** have **no** dedicated route to fetch a signed URL for their own file (RLS/session-scoped student endpoint would be the pattern).

---

## 6. Gaps and risks

| Topic | Issue |
|-------|--------|
| **Instant positive message** | Upload succeeds → modal closes immediately; user may not see explicit “we got your file” copy (only indirect: card shows in-review / polling). |
| **Rejected feedback** | Polling updates `ai_reason` in state, but **current** `ChallengeCard` (challenges) does not surface rejection text (contrast: legacy `student/ChallengeCard.tsx` did). |
| **View submission** | No student API like admin image route; UI does not show thumbnail or lightbox. |
| **Durable background jobs** | Fire-and-forget HTTP is fragile; production-grade “background” usually means **queue** (e.g. Inngest, QStash, Supabase `pg_net` + worker, or a cron that processes `pending`). |
| **Verify route auth** | `POST /api/submissions/verify` has **no shared secret** (any caller could POST a `submissionId` if UUID is known). **Hardening:** internal secret header, or only invoke from a trusted worker, or Supabase Edge Function with service role. |
| **Serverless timeout** | Long-running Claude calls can hit route limits; **queue + worker** mitigates. |

---

## 7. What you need to build (aligned with goals)

### 7.1 Instant message after upload (UX)

- **Option A:** In `MissionModal`, after `result.success`, show a short **success state** (banner + “We’ll notify you when review completes” or similar) for 1–2s, then close; or keep toast via `ToastProvider` (see `src/components/ui/Toast.tsx`).
- **Option B:** Do not close modal immediately; show success panel with **primary CTA** “Close”.
- Ensure copy distinguishes **upload received** vs **challenge accepted** (the latter can still use `XPToast` or a separate toast).

### 7.2 True background evaluation

- Keep upload API **fast** (storage + DB only).
- Move verification to:
  - **Queue job** enqueueing `submissionId` after upload, **or**
  - **Database trigger** / **scheduled** worker that picks `pending` rows older than N seconds, **or**
  - **Vercel** `waitUntil` / background function if supported.
- Add **retry/backoff** and **dead-letter** logging for failed AI calls.
- Optionally add **`processing_started_at`** or **`verification_attempts`** column for observability.

### 7.3 “View my submission”

- **API:** e.g. `GET /api/submissions/[id]/image` (or query by `taskId`) with **student session** cookie + `student_id` match → return `{ signedUrl }` or `redirect` to signed URL (short TTL, same pattern as admin).
- **UI:** On challenge card or modal: if `file_url` and status not `not_started`, show **thumbnail** (Next Image with signed URL) or **“View proof”** opening dialog/lightbox.
- **Security:** Never expose raw storage paths publicly; always signed URLs and ownership checks.

### 7.4 Surface AI feedback on reject (optional but recommended)

- If `status === "rejected"` and `ai_reason` present, show on card back or in a small panel (reuse patterns from `student/ChallengeCard.tsx`).

---

## 8. Checklist for implementers / LLM context

- [ ] **Upload response:** Keep `{ success, data: { submissionId } }`; add optional `message` field for UI copy if desired.
- [ ] **MissionModal:** Show **immediate** success feedback after upload; then close or navigate.
- [ ] **ChallengeBoard:** Optionally pass `submission` / `ai_reason` into `ChallengeCard` for display.
- [ ] **New route:** `GET` student-scoped signed URL for submission image (mirror admin `image` route with `verifyStudentSession` + `student_id` check).
- [ ] **ChallengeCard / modal:** Thumbnail or “View submission” when `file_url` present.
- [ ] **Background:** Replace `void fetch(verify)` with queue or durable worker; add monitoring.
- [ ] **Security:** Protect `POST /verify` with internal auth or move to non-public worker.
- [ ] **Rejected path:** Toast or inline message when status → `rejected` (parity with accepted XP toast).

---

## 9. Environment / dependencies

- **Anthropic:** `ANTHROPIC_API_KEY` required for `/api/submissions/verify`.
- **Supabase:** Service role (`adminClient`) for storage + DB in API routes.
- **Bucket:** `submissions` (private; access via signed URLs).

---

## 10. Summary

| Item | Status |
|------|--------|
| Upload + DB `pending` | Implemented |
| Non-blocking trigger of verify after upload | Implemented (HTTP fire-and-forget) |
| AI verdict + DB update | Implemented |
| Student polling for final status | Implemented |
| Instant “upload received” UX | **Partial / weak** (modal closes without dedicated message) |
| Durable background queue | **Not** implemented |
| Student view uploaded image | **Not** implemented (admin has; student has no signed-URL API) |
| Student-visible `ai_reason` on main challenge UI | **Not** on `challenges/ChallengeCard` |

This file is intended as **context for models** and humans planning the next iteration of task evaluations without re-reading the codebase.
