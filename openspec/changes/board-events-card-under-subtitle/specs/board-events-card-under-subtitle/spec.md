# board-events-card-under-subtitle Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-events-card-under-subtitle](../../)

## ADDED Requirements

### Requirement: A subtitled appointments card starts its rows 8px under the header

In the board look, a main-column card holding an appointments list (`.cn-events-card`) SHALL start its content 8px under its header, also when the header has a subtitle.

#### Scenario: DqTaak Afspraken

- GIVEN the task "Hoorzitting inplannen" in the board look, with the "Afspraken" card titled and subtitled
- THEN the first appointment's rule is 8px under the header, 41px under the title's top
