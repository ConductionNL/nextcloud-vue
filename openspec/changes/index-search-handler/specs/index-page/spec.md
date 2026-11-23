# index-page Specification (delta)

## ADDED Requirements

### Requirement: A registered handler can read the search before it is sent

An index page in self-fetch mode MAY name a handler from the app's registry as `config.searchHandler`. Before the list is fetched for a new search term, the page SHALL call the handler with the term, once per term. When it answers an object, the page SHALL send its `search` as `_search` (no `_search` when it is empty or absent), SHALL add its `filters` to the query, and SHALL show its `note` above the list as a status line while that term is searched. When it answers `null`, throws, or the name is not registered, the page SHALL send the term as typed and show no note.

#### Scenario: A phone number becomes a filter

- GIVEN an index page with `config.searchHandler: "phoneSearch"` and a handler that answers `{ filters: { phoneE164: "+31612345678" }, note: "Searching by phone number" }` for `06 1234 5678`
- WHEN the user types `06 1234 5678` in the search box
- THEN the list request carries `phoneE164=+31612345678` and no `_search`
- AND the page shows "Searching by phone number"

#### Scenario: Other text is searched as typed

- GIVEN the same page and a handler that answers `null` for `riolering`
- WHEN the user types `riolering`
- THEN the list request carries `_search=riolering`
- AND no note is shown

#### Scenario: The manifest schema accepts searchHandler

- GIVEN a manifest whose index page config declares `searchHandler: "phoneSearch"`
- WHEN it is validated against the app manifest schema
- THEN it is valid
