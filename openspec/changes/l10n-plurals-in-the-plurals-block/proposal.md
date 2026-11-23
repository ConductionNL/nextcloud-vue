# Proposal: l10n-plurals-in-the-plurals-block

## Why

DqFilterInMenu on :8080 (24 Oct, r25b): the Active line read "Termijn: within 7 days" for a Dutch reader. Five plural
entries ("within %n day", "%n feature", "%n page: {pages}", "%n page, including {pages}", "{on} of %n is in the menu")
sat in the `translations` block of en.json and nl.json instead of `plurals`, so `pluralEntries()` never registered them
and every one fell back to English.

## What changes

The five entries move to the `plurals` block in en and nl; the four now translated leave the Dutch missing baseline. A
test asserts that no catalog keeps an array among its singular translations.
