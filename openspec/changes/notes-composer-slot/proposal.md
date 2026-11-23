# Proposal: a slot above the note composer

## Why

Dossiq offers note templates (its change `starter-content-and-templates`, task 7.2): a handler
picks a template and the note composer fills with its text. `CnNotesTab` renders its composer
with nowhere for an app to put that picker, so the offer existed in dossiq and was mounted
nowhere.

## What Changes

- `CnNotesTab` gains a `composer-before` scoped slot, rendered directly above the composer,
  with `{ setText, text }` in scope. `setText(text)` fills the composer; `text` is its current
  content.
- Without the slot nothing changes.

## Impact

- `src/components/CnObjectSidebar/CnNotesTab.vue`
- `tests/components/CnNotesTabComposerSlot.spec.js`
- No breaking change; additive.
