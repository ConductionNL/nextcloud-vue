# Tasks: widget-registry-public-flag

> Registry flag, public render path, gate, markdown widget (ADR-032 `kind: code`).
> Checkbox budget: 4 tasks × 2 = 8 unindented `- [ ]` lines (cap 20).

## Implementation Tasks

### Task 1: The public flag on the registry
- **spec_ref**: `openspec/changes/widget-registry-public-flag/specs/widget-registry-public-flag/spec.md#requirement-every-registry-entry-must-carry-a-public-flag-defaulting-to-false`
- **files**: `src/registry/dashboardWidgetRegistry.js`, `src/registry/__tests__/dashboardWidgetRegistry.spec.js`
- **acceptance_criteria**:
  - Every pre-existing registration reports `public: false` — asserted by enumerating the whole registry, so a newly added type cannot slip through unlisted
  - `public: true` is recorded only when explicitly passed
  - A non-boolean value fails registration rather than being coerced
- [ ] Implement
- [ ] Test

### Task 2: Public render path degrades instead of throwing
- **spec_ref**: `openspec/changes/widget-registry-public-flag/specs/widget-registry-public-flag/spec.md#requirement-a-public-host-must-render-only-public-widgets-and-must-degrade`
- **files**: `src/components/CnDashboardGrid/CnDashboardGrid.vue`, `src/components/CnPageRenderer/CnPageRenderer.vue`, `src/components/__tests__/publicWidgetGating.spec.js`
- **acceptance_criteria**:
  - Under the public host, a non-public or unknown key renders an inert placeholder and the widget's own code does NOT execute — asserted by a spy on the component, not by the absence of visible output
  - A page with one bad key still renders its other widgets
  - The same widget renders normally under the nextcloud host — the flag is a public-host restriction, not a global disable
- [ ] Implement
- [ ] Test

### Task 3: Gate on portal-rendered widget keys
- **spec_ref**: `openspec/changes/widget-registry-public-flag/specs/widget-registry-public-flag/spec.md#requirement-a-gate-must-refuse-a-non-public-widget-on-a-public-page`
- **files**: `.claude/skills/hydra-gate-public-widget/SKILL.md`, `scripts/gates/public-widget.mjs`, gate fixtures
- **acceptance_criteria**:
  - Fails on a portal manifest placing a non-public key, naming the page and the key
  - The NEGATIVE fixture runs in CI: a deliberately non-public placement must fail the gate, so a green run is evidence and not silence — this gate is the only thing standing between the shared catalog and anonymous exposure
  - Passes on a conforming manifest
  - Scoped to the PR diff per ADR-020
- [ ] Implement
- [ ] Test

### Task 4: Markdown widget
- **spec_ref**: `openspec/changes/widget-registry-public-flag/specs/widget-registry-public-flag/spec.md#requirement-a-markdown-widget-must-render-prose-inside-a-grid-page`
- **files**: `src/components/CnMarkdownWidget/CnMarkdownWidget.vue`, `src/components/CnMarkdownWidgetForm/CnMarkdownWidgetForm.vue`, `src/components/__tests__/CnMarkdownWidget.spec.js`
- **acceptance_criteria**:
  - Renders through the EXISTING `cnRenderMarkdown` path; output equivalence with `CnWikiPage` is asserted, so there is one markdown renderer rather than two that drift
  - Placeable by the standard `$defs.widgetEntry` shape with normal grid geometry
  - Registered `public: true`
  - Script tags and `javascript:` URLs do not execute under the public host — asserted on the RENDERED DOM, not on the sanitiser's configuration
- [ ] Implement
- [ ] Test
