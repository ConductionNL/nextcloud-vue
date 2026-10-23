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
