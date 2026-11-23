# index-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [list-counts-in-one-request](../../)

## ADDED Requirements

### Requirement: List counts go out as one request

When a page counts two or more lists through the list endpoint, it SHALL send them as one request to OpenRegister's
batch count endpoint, each filter in the form the list request sends it, and SHALL fall back to one list request per
list when that request fails. A single list SHALL keep its own list request.

#### Scenario: DqZaken saved views and quick filters

- GIVEN the Cases list with 13 saved views and 20 quick filters that carry a count
- WHEN the page loads
- THEN their list-endpoint counts arrive in one `POST /apps/openregister/api/objects/counts`
- AND each number equals the list's total for that filter

#### Scenario: An OpenRegister without the batch endpoint

- GIVEN the batch request answers 404
- THEN every list is counted with its own `_limit=1` list request, as before
