## ADDED Requirements

### Requirement: The store watches one run while it is active

`useFlowStore` SHALL provide a `watchRun(uuid)` action that polls
`GET /apps/openregister/api/flow-runs/{uuid}` while the run's `status` is one
of the engine's non-terminal statuses (`queued`, `running`, `suspended` — the
set `FlowRun::ACTIVE` names), and SHALL stop polling by itself when the status
turns terminal (`completed`, `stopped`, `failed`, `dead_letter`), when a
different run is watched, or when the watching surface unmounts.

The poll interval SHALL default to 3 seconds and SHALL be floored at 2
seconds. Polling SHALL pause while the document is hidden and resume with one
immediate fetch when it becomes visible, matching the behaviour
`CnFlowRunsWidget` already ships.

`run()` SHALL begin watching the run it queued: the engine's
`POST /apps/openregister/api/flows/{id}/run` already answers with the created
run, uuid included, and that uuid SHALL NOT be discarded as it is today.

#### Scenario: Pressing Run starts a watch

- **GIVEN** a saved flow open in the editor
- **WHEN** the host triggers `store.run()` and the POST returns a queued run
- **THEN** the store polls that run's uuid on the interval
- **AND** the polling stops without intervention once the run reports a terminal status

#### Scenario: A hidden tab does not poll

- **GIVEN** a watched run that is still active
- **WHEN** the document becomes hidden
- **THEN** no further polls are issued until it is visible again
- **AND** becoming visible issues one immediate fetch and resumes the interval

### Requirement: The watcher exposes ordered steps and never replays one

The watcher SHALL expose the watched run's `log` as an ordered list of steps,
diffed by index against what it has already exposed, so a consumer can tell
which steps are NEW since the previous poll. Within one run the log only
grows (the engine appends per pass and a resumed pass appends after the
`suspended` entry), so index diffing is exact.

The steps SHALL be the engine's log entries as delivered —
`{transition, type, status, durationMs, error?, reason?}` — with no
client-side reordering, no synthesis of entries the engine did not write, and
no invented timestamps (the log carries none).

#### Scenario: A resumed run appends, it does not restart

- **GIVEN** a run that suspended after three logged steps and was resumed
- **WHEN** the next poll delivers a log of seven entries
- **THEN** only entries four to seven are exposed as new

### Requirement: The canvas animates the run FlowMock-style, from real steps only

While a run of the open flow is being watched or replayed, `CnFlowDetail`
SHALL render run state onto its node cards and edges:

- the node whose step is currently being animated SHALL carry a halo pulse in
  the success colour (`--color-success` — the library's rendering of
  FlowMock's mint);
- the edge just executed — the `canvasEdges` line whose `source` is the
  previously animated node and whose `target` is the current one — SHALL be
  traced by an animated success-coloured segment travelling source to target,
  using `stroke-dashoffset` travel over the same routed geometry the canvas
  already draws (FlowMock's technique; since the Vue Flow migration the edge's
  own direction-pulse path carries the travel, so the base line stays solid);
- nodes whose steps completed (status `completed` or `pinned`) SHALL keep a
  subtle success-coloured border or accent for the rest of the run;
- a node whose step reported `failed` (or `stopped` carrying an error) SHALL
  be coloured with `--color-error` and SHALL keep that colour;
- a node whose step reported `suspended`, and likewise a watched run sitting
  in run-status `suspended`, SHALL show a slow pulsing hold state — visibly
  waiting, visually distinct from executing and from failed.

Node identity SHALL be resolved by matching a step's `transition` to the
canvas node's `id` verbatim — the engine guarantees they are the same string —
and a step whose `transition` matches no node on the canvas SHALL be skipped
with the mismatch surfaced (the flow has been edited since the run), never
mapped onto a different node.

All colours SHALL be Nextcloud CSS variables; FlowMock's literal marketing
tokens (`--c-mint-500`, vermillion) SHALL NOT appear.

#### Scenario: A completed hop paints trace, pulse, and residue

- **GIVEN** a watched run whose poll delivered a new `completed` step for node B, following node A, with an edge A→B on the canvas
- **WHEN** the step is animated
- **THEN** the A→B edge is traced with a travelling success-coloured segment
- **AND** node B pulses while it is the current step
- **AND** node A keeps a subtle success accent

#### Scenario: A failed step ends red and stays red

- **GIVEN** a watched run whose latest step for node C carries status `failed`
- **WHEN** the step is animated
- **THEN** node C is coloured with the error colour and remains so after the run ends

#### Scenario: An await-signal step visibly holds

- **GIVEN** a watched run whose latest step carries status `suspended`
- **WHEN** the canvas renders
- **THEN** that node shows the pulsing hold state until the watcher reports the run moved on

#### Scenario: A step for a deleted node does not corrupt the picture

- **GIVEN** a replay of a run whose log names a node id no longer on the canvas
- **WHEN** that step's turn comes
- **THEN** it is skipped and the mismatch is stated
- **AND** subsequent steps continue on their own nodes

### Requirement: Bursts animate in order and catch up quickly

Because the engine persists the log once per worker pass, a single poll MAY
deliver many steps at once. The animator SHALL queue new steps and play them
strictly in log order at a bounded per-hop pace, such that a burst reads as a
fast sequence of hops rather than a simultaneous repaint — and SHALL NOT
interpolate or fabricate per-step timing between polls to simulate liveness
the data does not contain.

While the watched run reports `running` with no new steps, the canvas SHALL
show an anticipation state (the start nodes' pulse) rather than pretending a
specific step is executing.

#### Scenario: Five steps in one poll play as five quick hops

- **GIVEN** a watched run whose poll delivers five new steps at once
- **WHEN** the animator drains them
- **THEN** each hop is animated in log order at the catch-up pace
- **AND** the total catch-up completes within a few seconds

### Requirement: A finished run can be replayed on the canvas

A completed run inspected from the Runs tab SHALL offer a Replay affordance.
Replay SHALL feed the run's stored per-step log — the same
`GET /apps/openregister/api/flow-runs/{uuid}` payload `inspectRun()` already
fetches — through the same animator, in log order.

Replay pacing SHALL be derived from each step's real `durationMs`, scaled and
clamped to a watchable per-hop window; it SHALL NOT use invented durations,
and the clamp bounds SHALL guarantee both that a long-waiting step does not
stall the replay and that a sub-millisecond step is still perceivable.

A replay in progress SHALL be cancelled by starting another replay, watching a
live run, or editing the graph.

#### Scenario: Replaying a completed run traces its recorded path

- **GIVEN** a completed run inspected in the Runs tab
- **WHEN** Replay is activated
- **THEN** the canvas animates the run's logged steps in order, ending in the run's recorded final state

### Requirement: Reduced motion renders state without motion

Under `prefers-reduced-motion: reduce`, the run-state classes SHALL still
colour the canvas — completed, failed, hold and current-step states remain
distinguishable — but nothing SHALL travel and nothing SHALL pulse: no dash
animation on edges, no halo or hold pulsing on nodes. This mirrors FlowMock's
own reduced-motion behaviour and the library's existing CnAiCompanion
precedent.

#### Scenario: Reduced motion still shows where the run is

- **GIVEN** a user whose system requests reduced motion and a watched run mid-flight
- **WHEN** the canvas renders
- **THEN** completed nodes carry the static success accent, the current node a static highlight, and no animation plays

### Requirement: CnGraphCanvas stays a geometry-only renderer

This change SHALL NOT add any prop, event, slot or status concept to
`CnGraphCanvas`. All run state SHALL be applied inside the node and edge slot
bodies `CnFlowDetail` already owns, per ADR-065's renderer/builder split.

#### Scenario: The canvas contract is unchanged

- **GIVEN** an existing consumer of `CnGraphCanvas` outside the flow editor
- **WHEN** this change ships
- **THEN** that consumer compiles and renders identically with no code change
