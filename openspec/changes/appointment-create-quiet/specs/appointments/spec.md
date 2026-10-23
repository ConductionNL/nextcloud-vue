# appointments Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [appointment-create-quiet](../../)

## ADDED Requirements

### Requirement: The appointment cards' create button can be secondary, with its own icon

CnEventsCard (`content.createVariant`, `content.createIcon`) and CnCalendarCard (`createVariant`, `createIcon` props)
SHALL draw the "Make an appointment" header action as a secondary button when the variant is `secondary`, and with
the named icon when one is given. Without them the action SHALL stay the primary button with a plus.

#### Scenario: DqTaak Afspraken

- **GIVEN** a task's appointments card with `headerActions: ["create"]`, `createVariant: "secondary"` and
  `createIcon: "CalendarPlusOutline"`
- **THEN** "Afspraak maken" is an outlined button with a calendar icon, not the filled primary

### Requirement: A card's flows can sit in its Actions menu

CnEventsCard SHALL report the flows named in `content.menuActions` (`link`, `create`) that `headerActions` does not
already name as `menuActions` on its `header` event, and the detail widget host SHALL draw a renderer's reported
`menuActions` as items of the card's Actions menu, showing that menu while it holds one.

#### Scenario: DqTaak Afspraken keeps "Bestaande koppelen"

- **GIVEN** a task's appointments card with `headerActions: ["create"]` and `menuActions: ["link"]`
- **THEN** the title row shows only "Afspraak maken", and "Bestaande koppelen" is an item in the card's Actions menu
