---
kind: code
---

# Proposal: grouped-cards-widget

## Summary

Board DqZaaktype's Fasen en taken tab draws a case type's phases side by side,
each a panel of task cards with a count, and a dashed box of the acts available
in every phase. No widget drew groups of cards from an endpoint. dossiq now
answers that shape at `GET /api/case-types/{id}/phases`.

## What changes

A `grouped-cards` widget type (CnGroupedCardsWidget) for detail pages and
dashboards: groups read at `groupsPath` of an endpoint payload, cards at
`itemsKey` of each group, templates for titles and the meta line, a count pill,
and an optional dashed `extraGroup`. Language maps read in the user's language
(new util `languageMapText`). No schema change: widget content keys are not
enumerated by the manifest schema; `grouped-cards` joins the library widget keys.
