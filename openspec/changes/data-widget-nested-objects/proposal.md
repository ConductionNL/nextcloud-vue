---
kind: code
---

# Proposal: data-widget-nested-objects

## Summary

`CnObjectDataWidget` showed a plain object whose values are plain objects, such as publiccode's per-language `description`, as compact JSON, so a catalog component's description could not be read (opencatalogi#1932). The same fields were inline-editable through the text fallback, which committed `"[object Object]"` or a string over the value.

## What changes

1. A plain-object value renders as a definition list with one nested list per plain-object entry. Deeper levels stay compact JSON. A long text keeps its line breaks and a list of scalars reads as one comma-separated line.
2. A nested key is labelled with its sub-schema `title` (translated) when the schema has one, else an identifier-shaped key is made readable by the new generic `humaniseKey` util (`shortDescription` → "Short description"). A plain key such as `nl` stays as written. `humaniseRuleKey` delegates to `humaniseKey`, so notification rule labels do not change.
3. A field with a `json`, `code`, `file`, `sub-objects` or `child-records` widget, or holding an object or a list of objects that is not a relation, is not inline-editable, also while empty and behind a formatter. A `field-<key>` slot still supplies an inline editor; `overrides.<key>.editable: true` no longer turns the text fallback back on.

## Scope

- `src/components/CnObjectDataWidget/CnObjectDataWidget.vue`, `src/utils/humaniseKey.js`, `src/utils/notificationRuleLabel.js`, `src/index.js`.
- No manifest schema change.
