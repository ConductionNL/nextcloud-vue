# index-page Delta: screens-quick-filter-sort

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-quick-filter-sort](../../)

## Purpose

Each lens reads in the order that suits it.

## ADDED Requirements

### Requirement: A quick filter can set its own order

A quick filter with `sort` SHALL order the list by it while that filter is active (single mode). Selecting a quick
filter without `sort` after one with `sort` SHALL return the list to the page's order. A page whose quick filters have
no `sort` SHALL sort as before.

#### Scenario: Upcoming and past meetings

- **GIVEN** a meetings index sorted `scheduledDate` desc, with lenses Komende (`sort: { key: "scheduledDate", order: "asc" }`, default) and Afgerond (no sort)
- **WHEN** the page opens
- **THEN** the list request orders `scheduledDate` asc
- **WHEN** the person selects Afgerond
- **THEN** the list request orders `scheduledDate` desc
