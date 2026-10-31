# api-call-delete Specification (delta)

## ADDED Requirements

### Requirement: An api-call action can send DELETE

An `api-call` action with `method: "DELETE"` SHALL send an HTTP DELETE to its resolved url, with its resolved payload (or params) as the request data. It SHALL toast and refresh the page as a POST does.

#### Scenario: Unlock a frozen record

- GIVEN a detail page header action `{ "type": "api-call", "method": "DELETE", "url": "/apps/openregister/api/objects/pipelinq/client/@objectId/freeze" }`
- WHEN the user chooses it on client `k1`
- THEN the page sends `DELETE /apps/openregister/api/objects/pipelinq/client/k1/freeze`
- AND it shows the success toast and refreshes the page

#### Scenario: The manifest schema accepts DELETE

- GIVEN a manifest whose header action declares `method: "DELETE"`
- WHEN it is validated against the app manifest schema
- THEN it is valid
