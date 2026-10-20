# detail-page Delta: detail-side-cards-per-tab

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-side-cards-per-tab](../../)

## Purpose

Let the side column follow the open body tab.

## ADDED Requirements

### Requirement: A side card can follow the open tab

A `tabs` widget on a CnDetailPage SHALL report its open tab's id to the page, on mount and on every switch. A side column entry with a non-empty `tabs` list SHALL show only while one of those tab ids is open; an entry without `tabs` SHALL show beside every tab. Edit mode SHALL show every entry.

#### Scenario: Velden

- **GIVEN** a case type page whose side column holds "Keuzelijst" with `tabs: ["fields"]` and "Historie" without `tabs`
- **WHEN** the reader opens the Velden tab, then the Statussen tab
- **THEN** Keuzelijst and Historie show beside Velden, and only Historie beside Statussen
