# ROADMAP_LABEL_BLOCKLIST

Frozen array of 20 `RegExp` patterns matching hydra pipeline / workflow labels
that should never be rendered as chips on a roadmap card. Matches the openregister
design D16 — kept in lockstep with the backend's display-blocklist intent.

## Patterns

```text
^build:                     code-review:queued, build:running, ...
^code-review:
^security-review:
^applier:
^retry:
^rebuild:
^fix:
^fix-iteration:
^build-retry:
^ready-                     ready-to-build, ready-for-code-review, ...
^needs-input$
^yolo$
^openspec$
^agent-maxed-out$
^pipeline-active$
^done$
:queued$                    build:queued, code-review:queued, ...
:running$
:pass$
:fail$
```

## Relationship to the issue filter

This is the **display blocklist** — it controls which label chips render on a
roadmap card after issues are fetched. Orthogonal to the **inbound issue filter**
(`labels=enhancement,feature`, design D23) which controls *which* issues come
back from GitHub. The blocklist hides hydra workflow labels even when the issue
also carries `enhancement` or `feature`.

## Usage

```js
import { ROADMAP_LABEL_BLOCKLIST } from '@conduction/nextcloud-vue'

const visibleLabels = item.labels.filter(
  (label) => !ROADMAP_LABEL_BLOCKLIST.some((re) => re.test(label.name))
)
```

## Reference

- Spec: `openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md`
  → Requirement "ROADMAP_LABEL_BLOCKLIST"
- Implementation: [src/utils/roadmapLabelBlocklist.js](../../src/utils/roadmapLabelBlocklist.js)
- Used by: [CnRoadmapItem](../components/cn-roadmap-item.md)
