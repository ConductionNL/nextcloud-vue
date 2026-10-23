# Proposal: flow-board-header-board-look

## Why

Board DqFlow's header draws "Actief" as a 42x24 switch with a 15/600 label beside it, a check on "Opslaan" and a
refresh-style icon on "Testen met een zaak". The flow board used Nextcloud's small switch, no icon on Save and a test
tube on the test button.

## What changes

- Active is a `role="switch"` button at 42x24 with an 18px knob, labelled by the visible "Active"/"Paused" text beside
  it (15px, 600). Clicking flips `enabled` and marks the flow changed, as before.
- Save carries a check icon; the test button the Autorenew icon.
- Merges DQ-L8's fix/flow-board-test-button-first (16cf2d2ee5): Test first, then Active, Check, Run, buildiq, Save.

## Reach

Every board-look flow page. Stacked on flow-board-inspector-fields. No schema change.
