---
kind: code
---

# Proposal: screens-own-saved-views

## Summary

PqMijnWerk (and DqMijnWerk) end with a card "Opgeslagen weergaven": "Van mij, alle statussen (9)", "Van mij,
opgelost deze maand (23)". Each is a link into the tickets list with that view applied. The `saved-view` widget needs a
static view id, which a user's own views (made later, per person) cannot be in a manifest.

A new `saved-views` widget lists the signed-in user's own saved views of a source as links, with optional counts.

## Scope

New CnSavedViewsWidget (self-registering, `saved-views`), docs, tests, harness e2e. Opt-in (a new widget type). No
schema change: a widget key is not an enum in the manifest schema.
