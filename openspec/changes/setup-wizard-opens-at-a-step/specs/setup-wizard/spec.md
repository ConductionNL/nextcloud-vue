# setup-wizard Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [setup-wizard-opens-at-a-step](../../)

## ADDED Requirements

### Requirement: The address can open the setup wizard at a step

When the address carries `?setup=<stepId>` and the app's setup has a step with that id, `CnAppRoot` SHALL open the
setup wizard at that step, also after the setup was finished or dismissed. `CnSetupWizard` SHALL open on its
`startStep` when a step has that id, over resuming, and SHALL ignore a `startStep` no step has. `?setup=open` SHALL
keep opening the wizard at its own start, and a step id the setup does not have SHALL open nothing.

#### Scenario: An admin is sent to the catalogue step

- **GIVEN** an app whose setup has the steps `welcome`, `demo-data` and `store`, all done
- **WHEN** the admin follows a link to `?setup=store`
- **THEN** the setup wizard opens at the step `store`
