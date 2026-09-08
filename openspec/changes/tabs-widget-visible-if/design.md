# Design: tabs widget visibility condition

## Component and surface

`CnTabsWidget` (`src/components/CnTabsWidget/`) and the `tabs` widget entry
in the manifest v2 schema. Kind: code in the library, config in the app.

## Key name

The analysis wrote `visibleIf`. The library already has one visibility
predicate, `$defs.visibleWhen` (REQ-MFL-2), and one evaluator,
`evaluateVisibleWhen`. The tab key is therefore `visibleWhen`, so a manifest
author learns one name and the validator reuses one definition.

## Manifest shape

```json
{
  "type": "tabs",
  "content": {
    "tabs": [
      { "id": "participants", "label": "Participants", "widgets": [...],
        "visibleWhen": { "source": { "register": "dossiq", "schema": "role", "filter": { "case": "@objectId" } }, "field": "@total", "op": "gt", "value": 0 } },
      { "id": "decision", "label": "Decision", "widgets": [...],
        "visibleWhen": { "field": "decision", "op": "ne", "value": null } },
      { "id": "files", "label": "Files", "widgets": [...] }
    ]
  }
}
```

## Evaluation

- Local mode (`field` on the page object): synchronous on every object
  change, through the existing evaluator.
- Source mode (`source` plus `@total`): one count request per tab on mount and
  after any write reported through the workspace context. The request is a
  `_limit=0` list on the source with the resolved filter, cached per page
  load.
- While a source condition is pending, the tab renders disabled with a
  loading state, not absent, so the strip does not jump.
- The active tab is never hidden underneath the user: when the active tab's
  condition turns false, the first visible tab becomes active and the route
  hash follows.

## Deep links

A route hash naming a hidden tab falls back to the first visible tab. No
error.

## Alternatives considered

- Hiding a tab when its first widget's list is empty: rejected, a tab holds
  several widgets and an empty list is not always "nothing to show".
- A `hideWhenEmpty` boolean: rejected, the predicate already covers it and
  also covers field-based conditions.
