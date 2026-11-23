# board-tonal-card-actions Delta: board-tonal-card-actions

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-tonal-card-actions](../../)

## Purpose

Let a list's Add and a connection's Set up be the boards' tonal pill, as a facts card's actions already can.

## ADDED Requirements

### Requirement: An object list Add can be the tonal pill

An object list whose content sets `addVariant: "tonal"` SHALL draw its Add, the empty state's Add, its extra adds and,
on a board card, the title-row Add and extra adds as tertiary buttons carrying `cn-button--tonal`, not stretched
across the card. Without `addVariant` the Adds SHALL stay as they are.

#### Scenario: Add product on a lead

- **GIVEN** a lead page whose products list sets `addLabel: "Add product"` and `addVariant: "tonal"`
- **WHEN** the list is drawn with rows
- **THEN** Add product carries `cn-button--tonal` and is not a wide button

#### Scenario: A list without addVariant

- **GIVEN** a list that sets no `addVariant`
- **WHEN** it is drawn
- **THEN** its Add is the wide tertiary button without `cn-button--tonal`

### Requirement: A connection that is not set up offers Set up as the tonal pill

CnConnectionsPanel SHALL draw "Set up" on a connection that is not set up as a button carrying `cn-button--tonal`, and
"Open settings" on a set up connection without it.

#### Scenario: Bluesky not set up

- **GIVEN** the connections Telephony (set up) and Bluesky (not set up), both with a settings screen
- **WHEN** the panel is drawn
- **THEN** Bluesky's Set up carries `cn-button--tonal` and Telephony's Open settings does not
