# menu-widget Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [menu-children-from-facet](../../)

## ADDED Requirements

### Requirement: A menu item can take its children from a facet

A menu item with `childrenFrom: { register, schema, field, url }` SHALL show one child per value of `field` in that
schema's facet, labelled by the facet, linking to `url` with `{value}` replaced by the URL-encoded value, after its
declared children. When the request fails the item SHALL keep only its declared children.

#### Scenario: DqCatalogus case type folders

- **GIVEN** "Case types" declares `childrenFrom` on `caseType.category`
- **WHEN** the catalogue opens
- **THEN** each category the case types use is a row under "Case types" that opens the case types index on it

### Requirement: A board tree draws its second level as sub-folders

In the board look a tree menu with `expandedByDefault` SHALL draw no carets, and its second-level rows SHALL be 28px in,
6px 10px, 14px in the muted ink.

#### Scenario: DqCatalogus "Informatie"

- **WHEN** the catalogue's folder card draws its case type folders
- **THEN** "Informatie" sits 28px in under "Zaaktypen" at 14px in the muted ink, with no caret beside "Zaaktypen"
