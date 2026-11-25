# cn-walkthrough Delta: setup-and-walkthrough-from-initial-state

## ADDED Requirements

### Requirement: A page may carry the walkthrough preferences

When the page carries `walkthrough_preferences` (`{ seen, progress }`, each
the stored preference value or null) in the app's initial state, CnAppRoot
SHALL resolve the last-seen version and the tour progress from it and make no
`GET /apps/{appId}/api/preferences/{key}` request for a part it carries.
`loadWalkthroughSeenVersion` and `loadWalkthroughProgress` SHALL take the
carried `{ value }` as `options.preloaded` and treat it exactly as the
endpoint's answer. A part the page does not carry SHALL be read as before.

#### Scenario: Both preferences are carried

- **GIVEN** the page carries `walkthrough_preferences` `{ seen: "1.2.0", progress: null }`
- **WHEN** the walkthrough state resolves
- **THEN** the seen version is "1.2.0", no progress is restored and no preference request is made

#### Scenario: Nothing is carried

- **GIVEN** the page carries no `walkthrough_preferences`
- **WHEN** the walkthrough state resolves
- **THEN** both preferences are read from the endpoint as before
