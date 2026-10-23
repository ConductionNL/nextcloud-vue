## ADDED Requirements

### Requirement: The side panel can count the list under its title

With `sidebar.subtitle` declared, the side panel SHALL show it under its title with the total and the rows shown filled in, instead of the schema description.

#### Scenario: DqFilterBeheren
- **GIVEN** `sidebar.subtitle: "{total} cases, {shown} on this page"`, 48 cases and 8 on the page
- **THEN** the panel SHALL read "48 cases, 8 on this page" in the reader's language
