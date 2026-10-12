---
kind: code
---

# Proposal: abstract-chips-field

## Summary

Ruben, 11 Oct 2026: pages are manifest configuration over abstract widgets. PtPortalInstellingen draws "Zonder
goedkeuring voor deze e-maildomeinen" as chips with an x and a "+ Domein" add chip; "Mag ingesloten worden op" and
"Talen" in the details card are the same list of short strings. The `chips-field` widget (CnChipsFieldWidget) binds
chips to an array-of-strings field of the current object, checks each new entry against a pattern, and saves every
add and remove with one PATCH of that field.

Existing widgets checked: `field-list` edits a list of OBJECTS drawn as rows (title, meta, pill) with an add form; a
list of plain strings drawn as chips is a different look and a lighter interaction, and `settings-form` has no array
type. With `options` the add chip offers a choice of the remaining options (languages) instead of free text.

## Scope

New widget, docs, unit tests, harness e2e. No schema change. Stacked on radio-cards (#1522), switch-rows (#1519) and
settings-form (#1515).

## Out of scope

The "2 aanmeldingen wachten op goedkeuring" link under the board's chips: a link to a filtered list is page
configuration, not part of this field.
