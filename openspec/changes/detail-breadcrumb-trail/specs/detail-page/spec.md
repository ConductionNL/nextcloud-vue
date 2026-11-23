# detail-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-breadcrumb-trail](../../)

## Purpose

A record page says where it sits, however deep.

## ADDED Requirements

### Requirement: A record page breadcrumb can name more than one level

When `breadcrumb` is a list, CnDetailPage SHALL draw each crumb with a label, in order, before the record's current
crumb. `currentField` and `separator` SHALL be read from the last crumb that sets them. One crumb SHALL work as before,
and an empty list SHALL draw no trail.

#### Scenario: DqZaaktype

- **GIVEN** `breadcrumb: [{ label: "Settings", href: "/index.php/settings/admin/dossiq" }, { label: "Case types", route: "CaseTypes" }]`
- **THEN** the trail reads "Settings / Case types / Omgevingsvergunning regulier"
