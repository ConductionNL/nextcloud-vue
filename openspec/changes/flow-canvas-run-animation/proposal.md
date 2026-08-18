# flow-canvas-run-animation

## Why

The marketing site now shows FlowMock: an abstract flow canvas on which a mint
run-line traces the trigger → step → approval → end route while each node it
passes gets a brief halo pulse. It is the promise the product page makes about
what running a flow *looks like*.

The real editor does not keep that promise. Pressing Run in `CnFlowDetail`
emits `run`, the host queues a run via `useFlowStore().run()`
(`POST /apps/openregister/api/flows/{id}/run`), the store refreshes the run
LIST once — and the canvas does not change at all. Every piece of run state the
store holds (`runs`, `steps`, `inspectedRunUuid`) renders as plain text in the
sidebar's Runs tab; none of it reaches the node cards or the edges. A user who
presses Run watches a perfectly still canvas and has to open a sidebar tab and
read a `<ol>` to learn what happened.

The data to do better already exists and already maps onto the canvas exactly:

- `GET /apps/openregister/api/flow-runs/{uuid}` returns the full run — its
  `status` and its per-step `log`, whose entries carry
  `{transition, type, status, durationMs, error?, reason?}`.
- A log entry's `transition` **is** the canvas node id: the engine builds one
  workflow transition per flow node, matched by
  `trim($node['id']) === $transitionName` (openregister
  `FlowTokenRouter.php:63`). No lookup table is needed — the run log speaks the
  canvas's vocabulary natively.
- Step statuses are a closed set the engine writes: `completed`, `pinned`,
  `failed`, `stopped`, `suspended` (openregister `FlowEngine.php`, the
  `$log[]` sites). Run statuses are `FlowRun::STATUS_*` with the non-terminal
  set named by `FlowRun::ACTIVE` (`queued`, `running`, `suspended`).

What is missing is purely frontend: nothing polls a single run while it is
active, no run state flows into the node/edge slots, and no CSS animates the
hop. This change adds those three things — FlowMock-style, on the real editor,
driven by the real log.

## What Changes

- **`useFlowStore` learns to watch one run.** A `watchRun(uuid)` action polls
  `GET /apps/openregister/api/flow-runs/{uuid}` while the run's status is
  non-terminal, exposes the run's log as ordered, animatable steps, and stops
  by itself on a terminal status. `run()` starts a watch on the run it just
  queued (the POST already returns the created run, uuid included).
- **`CnFlowDetail` paints run state on its own node cards and edges.** The
  canvas contract does not move: `CnGraphCanvas` stays a geometry-only
  renderer per ADR-065 — CnFlowDetail already owns the node and edge slot
  bodies, and the run-state classes go there.
- **The FlowMock visual language, in Nextcloud tokens.** Mint trace along the
  edge just executed (`stroke-dashoffset` travel, exactly FlowMock's
  technique), a halo pulse on the node now executing, a subtle mint
  (`--color-success`) edge kept on completed nodes, `--color-error` on a
  failed node, and a slow pulsing hold on a suspended (await-signal) node.
  FlowMock's literal `--c-mint-500` / vermillion are the marketing palette;
  the library renders the same grammar with its semantic variables so nldesign
  theming keeps working.
- **Replay on a finished run.** The Runs tab's existing `inspectRun(uuid)`
  already fetches the per-step log; a Replay affordance next to it plays that
  log through the same animator — each step's real `durationMs` compressed
  into a watchable window, never an invented cadence.
- **Reduced motion = static colouring.** With
  `prefers-reduced-motion: reduce`, state colours still apply (completed,
  failed, suspended, executing) but nothing travels and nothing pulses — the
  same convention FlowMock itself ships.

## Design decisions

**Polling, not push — because that is what exists.** There is no SSE or
websocket surface for flow runs. OpenRegister proves the platform *can* stream
(`ChatStreamController`, `GraphQLSubscriptionController`), but the flow-run
API is REST only, and this spec does not invent a channel the backend does not
have. Push is explicitly out of scope; see design.md for what it would buy.

**Steps arrive in bursts, by construction — the animator must catch up, not
pretend.** `FlowRunService::execute()` persists the log ONCE per worker pass
(`setLog($log)` at the pass's end), not per step. So a poll during a pass sees
`status: running` with the log still empty, and the next poll sees every step
of the pass at once. The animator therefore keeps an ordered queue of
not-yet-animated steps and plays them in log order at a bounded catch-up pace
— it never interpolates fake per-step timing between polls to look "live".

**The canvas stays dumb.** `CnGraphCanvas`'s header is explicit: "no statuses,
no steps" — it is a shared renderer, not a flow builder (ADR-065). Run state
enters through the slot bodies `CnFlowDetail` already renders, so no prop, no
event and no slot of `CnGraphCanvas` changes.

**The store animates nothing.** `useFlowStore` exposes *facts* (the watched
run, its ordered steps, which are new since the last poll). The animation
timeline lives in `CnFlowDetail`, the only place that knows what a hop looks
like. Splitting it this way keeps the store testable without a clock.

**A run replayed onto an edited flow must not lie.** The log names node ids
that may no longer exist on the canvas (the flow was edited since the run). A
step whose `transition` matches no node is skipped and the mismatch stated —
never guessed onto the nearest card.
