---
kind: code
---

# Proposal: live-check-follow-ups

## Summary

Five small fixes found while checking 2.61.0 on a live Nextcloud:

1. The v2 manifest schema takes version 2.43.0, and a test fails when its
   content changes without a new version.
2. A link card looks like a card under a theme that underlines every link.
3. The title of the links, reports, store and wiki pages no longer sits under
   the navigation toggle.
4. An attention card whose count request fails says so in one quiet line.
5. On a page below a list, the menu marks the list's entry when every entry on
   that list carries a `query`.

## Motivation

- 2.61.0 added the `links` page type under schema version 2.42.0. The gate
  tooling vendors the schema and compares versions, so it could not see the
  schema had moved and rejected manifests that were correct.
- thematiq sets `a { text-decoration: underline !important }`. A scoped class
  rule without `!important` loses to it, so card labels and descriptions read
  as plain hyperlinks.
- The page shells that draw their own heading did not reserve the 56px the
  other page types do.
- A banner whose `visibleWhen` request fails stays hidden. That reads as
  "nothing to report" when the truth is "not known".
- Since 2.61.0 an entry with a `query` is active only when the address carries
  it. On a detail page the address carries the detail page's query, so no
  entry was marked.

## Affected projects

- `nextcloud-vue`: components, CSS, schema version, tests, docs, l10n.
- Consumers: every app picks the fixes up on upgrade. No manifest change needed.

## Backward compatibility

Additive. No prop, slot, event or schema rule changes meaning. The schema
content is unchanged apart from its `version`.

## Theming

Nextcloud CSS variables only. No hardcoded colours.
