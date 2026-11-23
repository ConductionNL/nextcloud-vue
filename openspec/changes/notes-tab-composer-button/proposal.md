# Proposal: notes-tab-composer-button

## Why

DqZaakEmail draws the case notes with a neutral "Notitie toevoegen" button and no open text field. A notes widget that
wires mentions or note actions renders CnNotesTab, which always shows its composer with a disabled primary "Add note".
CnNotesCard already has `composer: 'button'` (notes-card-composer-button); the tab did not, and the integration did
not forward it there.

## What changes

- CnNotesTab gets `composer: 'inline' | 'button'`. With `button` an "Add note" secondary button (aria-expanded) shows
  the composer; saving a note closes it; a reply or an edit opens it.
- The `notes` integration forwards `composer` to CnNotesTab as it does to CnNotesCard.
- Board look: that button is 40px.

## Scope

CnNotesTab.vue, integrations/builtin/notes.js, look-board-detail.css. No schema change.
