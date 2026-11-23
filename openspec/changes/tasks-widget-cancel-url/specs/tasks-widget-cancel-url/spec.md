## ADDED Requirements

### Requirement: Cancel posts to the app route when one is set

CnTasksWidget SHALL post Cancel to `content.cancelUrl` with `{id}` replaced by the task uuid when it is set, and to the engine's flow-tasks route otherwise. A refusal SHALL show the server's message.

#### Scenario: dossiq

- **GIVEN** a tasks widget with `cancelUrl: "/apps/dossiq/api/case-tasks/{id}/cancel"`
- **WHEN** the handler presses Cancel on task "open-1"
- **THEN** the widget posts to `/apps/dossiq/api/case-tasks/open-1/cancel`
