# Tasks: flow-canvas-run-animation

- [ ] `useFlowStore.watchRun(uuid)` — poll `GET /apps/openregister/api/flow-runs/{uuid}`
      every 3s (floor 2s) while status is in `queued|running|suspended`;
      self-stop on terminal status / re-watch / teardown; pause on
      `visibilitychange` with one refetch on return (CnFlowRunsWidget
      precedent); expose the run and its log with an index-diffed "new steps"
      view.
- [ ] `useFlowStore.run()` keeps the uuid the POST returns and starts the
      watch instead of only refreshing the run list.
- [ ] Animator in `CnFlowDetail` — ordered step queue, bounded catch-up pace
      for bursts, cursor-derived node/edge state; anticipation state (start
      node pulse) while `running` with an empty log; teardown on unmount,
      graph edit, or new watch.
- [ ] Run-state rendering in `CnFlowDetail`'s node slot — halo pulse
      (current), success accent (completed/pinned), error colour (failed /
      stopped-with-error), pulsing hold (suspended) — Nextcloud CSS variables
      only.
- [ ] Edge trace overlay in `CnFlowDetail`'s edge slot — success-coloured
      segment travelling the executed edge via `pathLength="1"` +
      `stroke-dashoffset` over the existing `edgeGeometry()` path; quiet
      success stroke kept on executed edges.
- [ ] Steps whose `transition` matches no canvas node are skipped and
      surfaced, never remapped.
- [ ] Replay affordance on an inspected completed run in `CnFlowSidebar`'s
      Runs tab — plays `store.steps` through the same animator, per-hop timing
      scaled from real `durationMs` and clamped; cancellable.
- [ ] `prefers-reduced-motion: reduce` — static state colouring, no dash
      travel, no pulses.
- [ ] JSDoc + regenerated docs partials for every touched prop/event/slot;
      `npm run check:docs` and `npm run check:jsdoc` clean.
- [ ] Unit tests — watcher lifecycle (start/stop/visibility/terminal),
      index-diffing across a suspend/resume, burst catch-up ordering,
      unknown-node skip, reduced-motion class output.
- [ ] Live verification against openregister on :8080 — run a real multi-step
      flow from the editor and a replay of a stored run; confirm no polling
      survives navigating away (network tab).
