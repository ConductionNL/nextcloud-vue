# flow-board Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [flow-board-trail](../../)

## Purpose

The flow board's header says where the flow sits and what it is for, as the boards draw it.

## ADDED Requirements

### Requirement: The flow board path names every level and carries the pill

With `breadcrumb` CnFlowBoard SHALL draw each crumb as its own link before the flow's name, a crumb without an href
linking to the flow list, and SHALL draw its pill at the start of the path row rather than beside the title. Without
`breadcrumb` it SHALL draw the one `listLabel` link.

#### Scenario: DqFlow

- **GIVEN** `breadcrumb: [{ label: "Instellingen", href: "/index.php/settings/admin/dossiq" }, { label: "Flows" }]` and pill "Flow van zaaktype"
- **THEN** the path reads "Flow van zaaktype Instellingen / Flows / Omgevingsvergunning regulier" with two links

### Requirement: The flow board notice can name the flow

CnFlowBoard SHALL replace `{name}` in its notice with the flow's name.

#### Scenario: DqFlow

- **GIVEN** the notice "Deze flow is de werkwijze van het zaaktype {name}." on the flow Omgevingsvergunning regulier
- **THEN** the notice reads "Deze flow is de werkwijze van het zaaktype Omgevingsvergunning regulier."
