# view-visible-when Delta: view-switch-containers

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [view-visible-when](../../)

## ADDED Requirements

### Requirement: A view is offered only to the readers its condition names

A page view MAY carry `visibleWhen`, the condition a widget takes. The page MUST offer the view only when the condition holds for the reader, and MUST NOT offer it while the condition has not answered or when it cannot be read. When the views left out leave one view, the page MUST NOT draw the switch. An address or a stored choice naming a view that is not offered MUST open the default view instead.

#### Scenario: A mentor sees the Mentor view
- **GIVEN** Today declares a Teacher view and a Mentor view whose `visibleWhen` reads `classes` from the mentor-classes endpoint with `notEmpty`
- **WHEN** a teacher who mentors H4b opens Today
- **THEN** the switch offers Teacher and Mentor

#### Scenario: A teacher who mentors no group sees no switch
- **GIVEN** the same views
- **WHEN** a teacher who mentors no group opens Today, or the endpoint cannot be read
- **THEN** the page draws no switch and shows the Teacher view
