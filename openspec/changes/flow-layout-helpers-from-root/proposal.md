---
kind: code
depends_on: []
---

# Proposal: flow-layout-helpers-from-root

## Why

The library lays out a flow that has no positions: `needsFullLayout`
says whether it must, and `layoutFlowNodes` places the nodes in layers
(`src/composables/flowGraphLayout.js`, from `flow-auto-layout`). Other
canvases need the same thing. stackiq's architecture views are drafted
by an assistant without positions and drawn on `CnGraphCanvas`, so stackiq
imports the helpers by their source path. That path is not a contract:
moving the file in a refactor breaks stackiq's build.

## Rows

No gap row in this lane's list names this. The sibling change that asks
for it:

- stackiq `architecture-assistant-drafted-views`, row `arch-ai-diagram`
  (stackiq matrix). Its design, Risks: "A deep import. The layout helpers
  come from `@conduction/nextcloud-vue/src/composables/flowGraphLayout.js`,
  not the package root. A library release that moves the file breaks the
  import at build time ... Asking the library to export them from the
  root is the clean fix and can follow."

## What changes

- `layoutFlowNodes`, `needsFullLayout`, `placeLooseNodes`,
  `readNodePoint` and the four layout constants are exported from the
  package root and from the composables barrel.
- A packaging test holds them there.

## Affected projects

- `nextcloud-vue`: `src/index.js`, `src/composables/index.js`, a test.
- Consumers: stackiq; hermiq and buildiq when they draw generated graphs.

## Backward compatibility

Additive. The source path keeps working, because the package map still
exposes `./src/*`.
