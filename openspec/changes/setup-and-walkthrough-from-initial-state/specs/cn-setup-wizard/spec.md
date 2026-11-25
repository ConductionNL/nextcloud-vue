# cn-setup-wizard Delta: setup-and-walkthrough-from-initial-state

## ADDED Requirements

### Requirement: A page may carry the setup status

`useSetupStatus(appId, manifest)` SHALL start at most one read of
`GET /apps/{appId}/api/setup/status` per app and page, however many callers
ask while that read runs; an explicit `refresh()` still reads again. When the
page carries `setup_status` in the app's initial state, the composable SHALL
take that value and make no request: a document is the status, and
`{ forbidden: true }` means the caller may not read setup state (as a 401/403
answer does). Without the key the composable SHALL read the endpoint as before.

#### Scenario: Two callers during the first read share it

- **GIVEN** a manifest with setup steps and no `setup_status` on the page
- **WHEN** useSetupStatus is called twice before the first read answers
- **THEN** the endpoint is asked once

#### Scenario: The page carries the status

- **GIVEN** the page carries `setup_status` `{ completed: true, steps: { region: { done: true } } }`
- **WHEN** useSetupStatus is called
- **THEN** no request is made, `loading` is false and no required step is unmet

#### Scenario: The page says the caller may not read it

- **GIVEN** the page carries `setup_status` `{ forbidden: true }`
- **WHEN** useSetupStatus is called
- **THEN** no request is made, `forbidden` is true and `completed` is true
