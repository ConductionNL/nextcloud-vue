## ADDED Requirements

### Requirement: The companion does not probe a backend that is not installed

`CnAiCompanion` SHALL check whether its chat backend app (`chatAppId`, default
`hermiq`) is installed for the current user, through `isAppInstalled`, before
any request. When it is not, the companion SHALL make no health request and
SHALL render nothing.

#### Scenario: hermiq is not installed

- GIVEN `OC.appswebroots` has no `hermiq` key
- WHEN an app shell mounts the companion with the default backend
- THEN no request goes to `/apps/hermiq/api/chat/health`
- AND no AI button renders

#### Scenario: hermiq is installed

- GIVEN `OC.appswebroots` has a `hermiq` key
- WHEN the companion mounts
- THEN it probes `/apps/hermiq/api/chat/health` as before and renders on 2xx
