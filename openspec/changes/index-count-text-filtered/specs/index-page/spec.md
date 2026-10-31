# index-page Delta: index-count-text-filtered

**Status**: proposed
**Scope**: nextcloud-vue

## ADDED Requirements

### Requirement: The count line can differ while a filter narrows the list

An index page with `countTextFiltered` SHALL show that template as its count line while a filter narrows the list: an
active filter with a value (from the address, the side panel or a filter strip) or a selected quick filter tab that
carries a filter. The template SHALL take the `countText` tokens (`{shown}`, `{total}`, the `countValues` names) in
either look, and a count value SHALL be read under the same filters, the address's included. Without a filter, or
without `countTextFiltered`, the count line SHALL stay as it was.

#### Scenario: The readers of one sending

- **GIVEN** an index page over messages with `countTextFiltered: "{read} of {total} read"` and the count value `read` (`{ metric: "count", filter: { read: true } }`)
- **AND** 24 messages share `sendingRef` `letter-5b`, 18 of them read
- **WHEN** a staff member opens the page with `?sendingRef=letter-5b`
- **THEN** the count line reads "18 of 24 read"

#### Scenario: The whole list

- **GIVEN** the same page
- **WHEN** a staff member opens it without a filter
- **THEN** the count line is the page's own line, not "{read} of {total} read"
