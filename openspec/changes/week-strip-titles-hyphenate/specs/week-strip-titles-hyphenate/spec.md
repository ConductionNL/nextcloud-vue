# week-strip-titles-hyphenate Delta: week-strip-titles-hyphenate

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [week-strip-titles-hyphenate](../../)

## Purpose

A long word in a week strip item breaks at a syllable, not at the column edge.

## ADDED Requirements

### Requirement: A week strip item hyphenates its words

The title and the meta of a `CnWeekStripWidget` item SHALL be hyphenated (`hyphens: auto`) by the rules of
their language: `content.lang` when it is a language tag, else the page's language. A word that cannot be
hyphenated SHALL still break rather than overflow its item. A `content.lang` that is not a language tag SHALL
be ignored.

#### Scenario: A long Dutch title in a narrow day

- **GIVEN** a Dutch page and an item titled "Parkeervergunningen binnenstad" in a day 120px wide
- **WHEN** the strip renders
- **THEN** the title breaks after a syllable with a hyphen ("Parkeer-" or "Parkeerver-"), not mid-syllable
- @e2e exclude hyphenation depends on the browser's dictionary for the language; checked on a live instance and in the unit test's stylesheet read

#### Scenario: Item texts in another language than the page

- **GIVEN** `content.lang: "nl"` on an English page
- **WHEN** the strip renders
- **THEN** the strip carries `lang="nl"` and its words hyphenate by Dutch rules
- @e2e exclude a markup attribute, covered by tests/components/CnWeekStripWidgetHyphenate.spec.js
