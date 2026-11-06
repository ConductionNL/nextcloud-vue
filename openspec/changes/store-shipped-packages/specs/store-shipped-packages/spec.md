## ADDED Requirements

### Requirement: Without a registry the board store lists the shipped packages
Under the board look a store page with `config.shipped` and no configured registry SHALL list the app's shipped packages from its own route, with version, summary and installed state. Install SHALL show only to a reader who may install, on an on-request package that is not installed.

#### Scenario: No registry
- GIVEN a store page with `config.shipped` and no registry
- WHEN the page opens
- THEN the packages are listed with a count of how many are installed

#### Scenario: A reader who may not install
- GIVEN a reader who is no administrator
- WHEN the list opens
- THEN no install button shows
