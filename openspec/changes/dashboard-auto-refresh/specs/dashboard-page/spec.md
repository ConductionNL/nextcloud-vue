# dashboard-page Specification (delta)

## ADDED Requirements

### Requirement: A dashboard reads its widgets again on a timer

A dashboard page with `autoRefresh` SHALL fire `cn:page:refresh` every `intervalSeconds` (default 300) while it is
mounted and SHALL stop when it unmounts. The widgets read again in place: the page MUST NOT reload and the scroll
position MUST stay. With `button` (default true) the header SHALL offer a refresh button that fires it at once and is
busy (spinning, disabled) until the reads handed to `waitUntil` land, 15 seconds at most. A page without `autoRefresh`
SHALL add no timer and no button.

#### Scenario: New work arrives on its own
- **GIVEN** My work with `autoRefresh: true` open
- **WHEN** 5 minutes pass
- **THEN** every data widget reads again, and the page is not reloaded

#### Scenario: Refresh now
- **GIVEN** My work with `autoRefresh: true`
- **WHEN** the user clicks the refresh button
- **THEN** the widgets read at once and the button spins until they answer

### Requirement: A dashboard says when its data may be outdated

A page refresh SHALL count as failed when a read handed to `waitUntil` answers `false`, rejects, or does not land
within 15 seconds; otherwise its time SHALL become the last good read. When the last refresh failed and the last good
read is older than `staleAfterSeconds` (default 600), the page SHALL show "Data may be outdated. Last updated: <time>"
with a Retry button; the widgets stay as they are. A good read SHALL remove the warning.

#### Scenario: The connection dropped
- **GIVEN** the reads have failed for 11 minutes
- **WHEN** the user looks at My work
- **THEN** the warning names the time of the last good read and offers "Retry"
