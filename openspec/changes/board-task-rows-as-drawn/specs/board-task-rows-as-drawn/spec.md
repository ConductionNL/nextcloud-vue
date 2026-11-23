# board-task-rows-as-drawn Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [board-task-rows-as-drawn](../../)

## ADDED Requirements

### Requirement: A board task row wraps as drawn

In the board look, a `CnTasksWidget` list with the subject and due line SHALL wrap a task's title and subject, set that
line at normal leading 4px under the title, and pad 20px under the list.

#### Scenario: DqMijnWerk "Mijn taken"

- **GIVEN** "Bezwaarschrift aanvullen bij de indiener" on "Bezwaar parkeerboete Havenstraat"
- **THEN** the title and the subject each wrap to two lines and the row is about 100px
