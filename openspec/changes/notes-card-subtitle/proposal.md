---
kind: code
---

# Proposal: notes-card-subtitle

## Summary

Board DqTaak draws the Notities card with a muted line under its title: "Alleen voor wie aan de taak werkt". dossiq
declares that line as the widget's `subtitle`. The notes integration draws its own card (CnNotesCard in a
CnDetailCard), and the subtitle never reached it (measured r25b, 24 Oct: no line, title inset 30.5 vs 21).

## Changes

The subtitle now travels the whole way:

- `CnDetailCard` takes a `subtitle`: a muted line under the title;
- `CnDetailWidgetHost` hands a component-mode integration the widget's translated `subtitle`;
- the notes adapter and CnNotesCard pass it on as they pass `title`, through their attributes to CnDetailCard.

Cards without a subtitle render as before.

## Scope

- `src/components/CnDetailCard/CnDetailCard.vue`
- `src/components/CnDetailWidgetHost/CnDetailWidgetHost.vue`
- No schema change (widget `subtitle` exists).
