# visible-when-reader-groups Specification (delta)

## ADDED Requirements

### Requirement: A visibleWhen condition can require the reader to be in a group

A `visibleWhen` condition with `readerGroups` (a list of Nextcloud group ids) SHALL hold only when the current user is in at least one listed group. Combined with `field`, `endpoint` or `source` in the same object, both SHALL hold. While the user's groups are not yet known, or when the lookup fails, the condition SHALL be false. It SHALL NOT replace the authorization check of the endpoint behind the element.

#### Scenario: A committee member sees the action

- GIVEN a header action with `visibleWhen: { "all": [ { "readerGroups": ["bezwaarcommissie", "admin"] }, { "field": "status", "op": "eq", "value": "in-deliberation" } ] }`
- AND the reader is in group `bezwaarcommissie`
- WHEN the advice request with status `in-deliberation` is shown
- THEN the action is in the Actions menu

#### Scenario: A reader outside the listed groups does not see the action

- GIVEN the same action
- AND the reader is in groups `behandelaars` only
- WHEN the advice request with status `in-deliberation` is shown
- THEN the action is not in the Actions menu

#### Scenario: An administrator sees the action through the admin group

- GIVEN the same action
- AND the reader is in group `admin`
- WHEN the advice request with status `in-deliberation` is shown
- THEN the action is in the Actions menu

#### Scenario: The action stays hidden while the groups load

- GIVEN the same action
- AND the reader's groups have not been fetched yet
- WHEN the page first renders
- THEN the action is not in the Actions menu
- AND it appears once the groups arrive and include a listed group

#### Scenario: One group lookup serves every condition on the page

- GIVEN a page with three header actions that each declare `readerGroups`
- WHEN the page renders
- THEN the reader's groups are fetched at most once

#### Scenario: The manifest schema accepts readerGroups

- GIVEN a manifest whose header action declares `visibleWhen: { "readerGroups": ["bezwaarcommissie"] }`
- WHEN it is validated against the app manifest schema
- THEN it is valid
