---
kind: code
---

# Proposal: week-strip-titles-hyphenate

## Summary

A day of the week strip is narrow: on dossiq's Mijn werk its item text column is about 90px. A long Dutch
word such as "Parkeervergunningen" did not fit, and `overflow-wrap: anywhere` broke it at the column edge,
mid-syllable ("Parkeervergu / nningen").

## What changes

1. The item title and meta take `hyphens: auto`. The browser breaks a long word at a syllable and adds a
   hyphen, by the rules of the element's language: the page's `lang` (Nextcloud sets it to the user's
   language), or `content.lang` when the item texts are in another language.
2. `overflow-wrap: anywhere` stays as the last resort, for a word the browser cannot hyphenate.
3. `content.lang` (a language tag) sets `lang` on the strip. A value that is not a language tag is ignored.

Without `content.lang` the markup is unchanged.
