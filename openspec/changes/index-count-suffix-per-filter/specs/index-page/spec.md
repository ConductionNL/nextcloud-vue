# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [index-count-suffix-per-filter](../../)

## Purpose

The count line under an index page's title can say what the selected quick filter or lens does.

## ADDED Requirements

### Requirement: The count line can say what the selected quick filter does

CnIndexPage SHALL take `countSuffixByFilter`, an object keyed by quick filter tab id or label, whose values are texts.
While a tab is selected whose `countSuffix`, or whose entry in `countSuffixByFilter` (by id, then by label), is a
non-empty text, the count line SHALL end with a middle dot and that text, through the host translate function. A tab's
own `countSuffix` SHALL come first. With several tabs selected, each selected tab's text SHALL be added in tab order.
An empty count line, a tab without a text, and a page without the key SHALL leave the count line as it is.

#### Scenario: The unassigned lens

- **GIVEN** `countSuffixByFilter: { "unassigned": "longest waiting first" }` and a lens with id `unassigned`
- **WHEN** the lens is selected and the count line reads "12 of 40"
- **THEN** the line reads "12 of 40 · longest waiting first"

#### Scenario: The All tab

- **GIVEN** the same page
- **WHEN** the All tab is selected
- **THEN** the line reads "12 of 40"
