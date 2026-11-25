---
kind: code
---

# Proposal: view-visible-when

## Summary

A page's views (`views`, view-switch-containers) were offered to every reader. A school's Today has a Teacher and a Mentor view, and a teacher who mentors no group must not see the switch (learniq `today-first-per-school-role`, requirement "A mentor switches Today to her mentor class"). A view now carries `visibleWhen`, the condition a widget already takes: the view is offered only when the condition holds for the reader.

## Scope

- `src/mixins/pageViews.js`: `declaredViews` (every declared view), `normalizedViews` (the views offered), `evaluateViewConditions()`; no switch when the hidden views leave one view.
- `src/schemas/app-manifest-v2.schema.json` 2.200.0: `views[].visibleWhen`.
- `docs/components/cn-dashboard-page.md`, `tests/components/CnPageViewsVisibleWhen.spec.js`.

## Out of scope

- A greeting header widget that draws the switch from its own `options[]`: it keeps its declared options.
