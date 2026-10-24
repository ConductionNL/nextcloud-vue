# index-sources Delta

## ADDED Requirements

### Requirement: A sorted task list puts open tasks first

When a task list sorts on the server, the tasks source SHALL ask the inbox for open tasks before finished ones.

#### Scenario: DqTaken by deadline

- **GIVEN** the task list sorted on Deadline ascending
- **THEN** the inbox request carries `sort=dueAt` and `openFirst=true`
