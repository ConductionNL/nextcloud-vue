# board-side-lead-and-status-gaps Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-side-lead-and-status-gaps](../../)

## Purpose

The case boards' "Aanvrager" and "Status" side cards keep the gaps the boards draw.

## ADDED Requirements

### Requirement: A side lead card keeps 12px under the lead

In the board look a side CnFactsWidget that opens on a lead SHALL keep 12px between the lead and the next part, the
same 12px it keeps under the title.

#### Scenario: DqZaak "Aanvrager"

- **GIVEN** the lead Sanne de Vries and the link "Contactgegevens bekijken"
- **THEN** the link starts 12px under the lead and the card is 141px tall

### Requirement: A side status card starts 10px under its title

In the board look a side card whose content is a CnSectionsWidget SHALL start that content 10px under the title box,
taking no half-leading off, since the status explanation is set on the normal line.

#### Scenario: DqZaak "Status"

- **GIVEN** the explanation "De ontvankelijkheid wordt beoordeeld, ..."
- **THEN** its glyphs start 10px under the title's
