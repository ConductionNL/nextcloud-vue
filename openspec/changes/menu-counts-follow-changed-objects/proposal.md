---
kind: code
---

# Proposal: menu-counts-follow-changed-objects

## Why

Rehearsal R3 of the Zuiddrecht demo (16 Oct): dossiq's sidebar read "Wachtrij 2" after the handler claimed one of the two queued cases, and kept reading 2 until the page was reloaded. dossiq already announces the claim (`dispatchObjectsChanged({ register: 'dossiq', schema: 'case', id })`, dossiq#3966), and the index pages and list widgets follow it. The filtered menu counts (`count: { register, schema, filter }`) are read once, when `CnAppRoot` mounts, and never again.

## What Changes

- `CnAppRoot` listens for `cn:objects-changed` while it is mounted and reads again every filtered menu count of the register and schema the signal names. A signal without a register or schema reads every filtered count again. A count that drops to zero hides its badge, as at mount.
- The listener is removed when the shell unmounts.

## Impact

- `src/components/CnAppRoot/CnAppRoot.vue`, `tests/components/CnAppRootMenuItemCounts.spec.js`.
- No new manifest key. An app that never dispatches the signal sees no change.
