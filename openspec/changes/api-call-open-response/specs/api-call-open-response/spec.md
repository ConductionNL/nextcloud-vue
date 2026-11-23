## ADDED Requirements

### Requirement: An api-call can open what the call answered

An `api-call` action with `openResponse` SHALL, after a successful call, open the address the answer holds at the named
field (default `url`), in a new tab when `newTab` is true. It SHALL open nothing when the call fails, when the field holds
no value, or when the value is neither an http(s) URL nor a server-relative path.

#### Scenario: a Talk room from a submission row
- **GIVEN** a row action `{ type: "api-call", url: "/apps/portaliq/api/submissions/@objectId/talk", openResponse: { newTab: true } }`
- **WHEN** the call answers `{ "url": "https://cloud.example/call/abc" }`
- **THEN** that address opens in a new tab

#### Scenario: an unsafe answer
- **WHEN** the call answers `{ "url": "javascript:alert(1)" }`
- **THEN** nothing opens
