---
kind: code
---

# Proposal: saved-view-summary-tokens-in-words

## Summary

A saved view's summary line printed its stored tokens: "Behandelaar @me, status lopend, deadline[gte] @today, deadline[lt] @today+7d" (r31 DqPersoonlijkeInstellingen). The line now reads tokens and ranges in words: `@me` "jij", `@myTeam` "mijn team", `@today` "vandaag", `@today+7d` "over 7 dagen"; a `field[gte]` / `field[lt]` pair folds into one range on the field, named as the active filter line names it ("deadline binnen 7 dagen"). A page's `filterLabels` still names a value first, so an app can say "Mijn zaken".

## Scope

- `src/utils/savedViewSummary.js`, l10n (en, nl), a jest test.

Also: a `filterLabels` entry with `valuesAlone: true` lets a value the page names read as the whole part, so dossiq's `assignee: { values: { "@me": "My cases" }, valuesAlone: true }` reads "Mijn zaken, deadline binnen 7 dagen".
