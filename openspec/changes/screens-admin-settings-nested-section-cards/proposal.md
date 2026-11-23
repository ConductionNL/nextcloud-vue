---
kind: code
---

# Proposal: screens-admin-settings-nested-section-cards

## Summary

Under the board look CnAdminSettingsShell draws its direct `.settings-section` children as cards in a grid. An app
whose settings component wraps its sections in one element (decidiq's Settings.vue, a `<div>` around six sections) got
no cards at all: the wrapper spanned the grid and its sections stayed unstyled. decidiq had to drop its wrapper to get
cards (decidiq #1729). The shell's board look now treats the sections inside such a wrapper as its own.

## Scope

- `src/css/look-board.css`: a shell child whose own children are sections takes no box (`display: contents`), and those
  sections are cards.
- No component change, no manifest key, no schema change.
