# Tasks: cn-flow-runs-widget

- [x] `CnFlowRunsWidget` — endpoint-bound via `useEndpointSource`, status dot +
      flow name + step/trigger + coarse age, capped rows with an honest
      remainder, quiet empty and error lines.
- [x] Poll interval (default 15s, floor 5s, `0` = off), paused on
      `visibilitychange`, one refetch + resume on return, timer cleared on
      unmount.
- [x] Opt-in row navigation on `content.rowRoute`, carrying the FLOW id.
- [x] `CnFlowRunsWidgetForm` — rows, interval, row route, empty text.
- [x] Self-registration under type `flow-runs` (renderer + form +
      defaultContent + display name + icon).
- [x] Barrel exports (`src/components/index.js`, `src/index.js`).
- [x] Docs pages for both components.
- [x] `config.rowRoute` honoured on `type:"index"` pages in `CnPageRenderer` —
      enables `rowClickToView`, wins over the detail-page lookup, and reports an
      unregistered route name instead of swallowing the rejection.
- [ ] Unit tests for the widget's poll/visibility behaviour and the renderer's
      rowRoute precedence — the widget is live-verified on hermiq's Dashboard;
      the jsdom tests are not yet written.
- [ ] Vue-2 (`beta`) backport — the widget is authored on the Vue-3 line, which
      is what the manifest-driven fleet consumes. Apps still on the Vue-2 line
      do not get it until this is ported.
