---
name: hydra-gate-public-widget
description: Fail a portal manifest that places a widget whose registry entry is not `public: true`. A public host mounts only public widgets; this gate is the check that a page does not ask for one it will refuse (or that a wrongly flagged one is reviewed). Diff-scoped per ADR-020. Run with `node scripts/gates/public-widget.mjs <manifest.json>...`.
---

# hydra-gate-public-widget

Runs `scripts/gates/public-widget.mjs` over the portal manifests in the PR diff.
It reads the public keys from `registerDashboardWidgets.js` (a key is public only
when its `registerDashboardWidget` block says `public: true`) and fails, naming
the page and the key, for every placement outside that set. It also fails when it
inspects nothing.

The negative fixture `tests/fixtures/public-widget/non-public.json` runs in CI
(`tests/scripts/publicWidgetGate.spec.js`): the gate is shown failing before a
clean run is read as a pass.
