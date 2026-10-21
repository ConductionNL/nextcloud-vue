# object-list Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [object-list-footer-links](../../)

## Purpose

An object list can end with the links a board draws under it.

## ADDED Requirements

### Requirement: An object list can end with a row of links

With `content.footerLinks` CnObjectListWidget SHALL draw a row of links under the list, each label and note through
the host translate. A `route` link SHALL carry its token-resolved `query` and follow the router; an `href` link SHALL
be a plain link. A link with `group` SHALL show only to members of that group.

#### Scenario: DqZaakGerelateerd

- **GIVEN** links "All cases on this object" (route `Cases`, query `object: @objectId`) and "Manage object types"
  (note "(administrators only)", group `admin`)
- **WHEN** an administrator opens the case
- **THEN** both links show, the second with its note

#### Scenario: Not in the group

- **GIVEN** the same links
- **WHEN** a user outside `admin` opens the case
- **THEN** only "All cases on this object" shows
