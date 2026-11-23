---
kind: code
---

# Proposal: abstract-sections-widget

## Summary

Ruben, 11 Oct 2026: pages are manifest configuration over abstract widgets;
a pattern in two or more apps gets one library widget.

"Several widgets in one tab, each under its own heading" is such a pattern.
dossiq wrote `CaseSectionsWidget` (`case-sections`, on four DqZaak tabs: the
documents list and the case folder, the parties and the contact with them,
...), portaliq wrote `PortalSettings` (the Instellingen tab of PtPortal: the
details form, house style, case types, sign-in, registration, accessibility,
drawn as cards in a main and a side column).

This change adds the `sections` widget type (CnSectionsWidget): headed
sections with a rule between them, or a card per section in one or two
columns. Sections name their widget inline or by sibling id; an empty
section takes no space.

Lane R's tab stack (`tabs[].widgetIds`, nextcloud-vue #1478) draws one column
of separate titled cards in a tab. That stays the shape for that case; this
widget covers headed sections and the two-column card grid.

## Scope

- New `sections` widget, a container type on the detail page.
- CnTabsWidget passes `availableWidgets` to its panel host, so a container in
  a tab can resolve sibling ids (it received an empty list before).
- Docs, unit tests, harness e2e.
- No manifest schema change.

## Out of scope

Migrating dossiq and portaliq: lane A writes the manifests
(round6/A/migrate-<app>.md), the app lanes apply them.
