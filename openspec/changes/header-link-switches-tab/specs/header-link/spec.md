# header-link Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [header-link-switches-tab](../../)

## Purpose

A card header link can lead to another tab of the same page.

## ADDED Requirements

### Requirement: A header link can open another tab of the page

A widget `headerLink` with `tab` SHALL draw as a `#<tab>` anchor, and the page's tab strip SHALL open the tab with that id
when the hash changes on an open page. An unknown tab id SHALL change nothing.

#### Scenario: DqZaaktype

- **GIVEN** the side Historie card with `headerLink: { label: "Alles bekijken", tab: "history" }`
- **WHEN** the user follows the link
- **THEN** the Historie tab opens on the same page
