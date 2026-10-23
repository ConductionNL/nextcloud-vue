# shipped-configuration-section Delta: shipped-configuration-remove-set

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [shipped-configuration-remove-set](../../)

## ADDED Requirements

### Requirement: An admin removes a loaded set after a confirm

With `setsUrl` the section SHALL list the loaded sets from `{ sets: [{ id, label }] }`,
labels through the host's translate. With `removeSetUrl` each set SHALL have a
Remove button named after the set, which SHALL ask first and post only after a
yes. The answer's `message` SHALL be shown, as an error unless `success` is
`true`; a refusal SHALL show the server's `message` or `reason`. The list SHALL
be read again after a removal.

#### Scenario: Removing the company example set

- **GIVEN** the loaded sets "Company" and the Remove button of "Company"
- **WHEN** the admin confirms
- **THEN** the section posts the set's remove path, shows the server's message and reads the sets again
