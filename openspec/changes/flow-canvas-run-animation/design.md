# Design: flow-canvas-run-animation

## The data, as it actually is

Everything below was read from the shipped code, not assumed.

### Endpoints (openregister, `appinfo/routes.php`)

| Purpose | Endpoint | Notes |
| --- | --- | --- |
| Queue / start a run | `POST /apps/openregister/api/flows/{id}/run` | Returns the created `FlowRun` (201), uuid included. `?sync=true` returns the *finished* run. `useFlowStore.run()` already calls this (async form). |
| One run, with its log | `GET /apps/openregister/api/flow-runs/{uuid}` | `FlowRun::jsonSerialize()`: `status`, `log`, `marking`, `error`, `resumeAt`, `created`, `updated`. `useFlowStore.inspectRun()` already calls this once. |
| Run list for a flow | `GET /apps/openregister/api/flow-runs?flowId=…` | `useFlowStore.loadRuns()`. |
| Live runs (org-wide) | `GET /apps/openregister/api/flow-runs/active` | Used by `CnFlowRunsWidget` (15s poll). Not used by the editor. |
| Resume a suspended run | `POST /apps/openregister/api/flow-runs/{uuid}/resume` | Exists; the hold state should visually invite it, but wiring a resume button is not this change. |

### The log entry is the animation's frame

Written by `FlowEngine` (openregister `lib/Service/Flow/FlowEngine.php`,
the `$log[]` sites around lines 390–500):

```
{ transition, type, status: 'completed'|'pinned'|'failed'|'stopped'|'suspended',
  itemsIn?, itemsOut?, input?, output?, durationMs?, error?, reason?, checkId? }
```

- `transition` **is the canvas node id** (`FlowTokenRouter.php:63` matches
  `node['id'] === transitionName`; `FlowRunService.php:694` stores it as
  `nodeId`). The mapping the animator needs is the identity function.
- Entries are **ordered** — the array is the walk.
- Entries carry **no timestamps**, only `durationMs`. Live timing between
  entries is unknowable after the fact; replay timing must be derived from
  `durationMs` (real data) and nothing else.

### Run statuses (`FlowRun`, openregister `lib/Db/FlowRun.php:98–143`)

Non-terminal (`FlowRun::ACTIVE`): `queued`, `running`, `suspended`.
Terminal: `completed`, `stopped`, `failed`, `dead_letter`.

### The burst problem is server-side and structural

`FlowRunService::execute()` sets `status: running` and persists **before** the
walk, then persists the log **once at the end of the pass**
(`setLog($log)` → `mapper->update($run)` at the suspend/terminal boundary).
There is no per-step write. Consequences the animator must own:

1. Mid-pass polls return `running` + a stale (usually empty) log. The correct
   rendering is the *anticipation* state: trigger pulsing, nothing traced.
2. When the pass ends (or suspends), one poll delivers every step at once.
   The animator drains them in order at a bounded pace (~250–400ms a hop),
   so a five-step burst reads as five hops, quickly — not as a teleport, and
   not as a fabricated slow-motion "live" feed.
3. A run that suspends mid-flow yields its log up to the `suspended` entry;
   the resumed pass appends. The watcher diffs by log index (the array only
   grows within a run), so already-animated steps never replay.

## Polling cadence vs SSE — honest note

**Today there is no push channel for flow runs.** SSE exists elsewhere in
openregister (`ChatStreamController` streams chat tokens;
`GraphQLSubscriptionController` exists for GraphQL subscriptions), so the
platform could grow `GET /api/flow-runs/{uuid}/events` — but it has not, and
this change does not pretend otherwise.

Given per-step granularity does not exist server-side anyway (one write per
pass), SSE would today deliver the same bursts with less latency. The honest
cost/benefit: polling at 3s on ONE run, only while the editor is open and only
while the run is non-terminal, is a bounded and self-terminating load; the
watcher also pauses on `visibilitychange` like `CnFlowRunsWidget` already
does. A push channel becomes worth building when the engine writes per-step —
both are **out of scope** here and noted for a follow-up spec.

Chosen cadence: **3 seconds** while watched, hard floor 2s, stop on terminal
status or watcher teardown (route change, component unmount, new watch).
Rationale: the editor's Run is interactive (a person is looking), so 15s (the
dashboard widget's cadence) feels dead; under 2s multiplies requests for no
extra information given end-of-pass writes.

## The animator (CnFlowDetail-side)

State machine per watched/replayed run, derived — never stored — from
`(steps, cursor)`:

- **node classes** — `…--run-done` (appeared in the log with
  `completed`/`pinned`), `…--run-active` (the step at the cursor; halo pulse),
  `…--run-failed` (`failed`, or `stopped` with `isError`), `…--run-hold`
  (`suspended`, slow opacity pulse; also applied from `run.status ===
  'suspended'` + `marking` when the log lags).
- **edge classes** — an edge is traced when its `source` is the previous
  animated node and its `target` the current one, resolved through the store's
  existing `canvasEdges` getter (which already normalises `{from,to}` and list
  endpoints). Trace = overlay path reusing `CnFlowDetail.edgeGeometry()`'s
  `d`, `pathLength="1"`, `stroke-dasharray`/`stroke-dashoffset` travel —
  FlowMock's exact technique (`FlowMock.module.css`, `.runline`). Completed
  edges keep a quiet `--color-success` stroke.
- **colours** — Nextcloud semantic variables only (library rule 7):
  `--color-success` for the trace/halo/done (FlowMock's mint),
  `--color-error` for failed (FlowMock's vermillion), `--color-warning` for
  the hold state. No `--c-*` marketing tokens.
- **reduced motion** — `@media (prefers-reduced-motion: reduce)`: no dash
  travel, no pulses; state classes still colour statically (the CnAiCompanion
  components set the library precedent).

Replay uses the same machine fed by `inspectRun()`'s already-fetched
`store.steps`, advancing the cursor on a timer scaled from each step's real
`durationMs` (clamped to [200ms, 1500ms] per hop so a 40-minute wait step does
not freeze the replay and a 3ms step is still visible). Scaling real durations
is presentation; inventing durations would be fabrication — the clamp is the
line between them.

## What deliberately does not change

- `CnGraphCanvas` — zero contract change; it remains status-free (ADR-065).
- `CnFlowSidebar`'s Runs tab keeps its textual step list; Replay is added
  beside it, it does not replace reading.
- No server change, no new endpoint, no schema change.
