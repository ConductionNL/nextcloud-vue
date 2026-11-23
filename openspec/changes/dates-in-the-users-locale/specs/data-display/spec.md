## ADDED Requirements

### Requirement: A date reads in the user's Nextcloud locale

A date or number the library formats SHALL be written in the locale the user chose in Nextcloud. The browser's locale SHALL only apply when Nextcloud names none.

#### Scenario: A Dutch user in an English browser
- **GIVEN** a user whose Nextcloud locale is nl_NL, in a browser set to en-US
- **WHEN** a data widget shows the date 2026-10-15
- **THEN** it SHALL read "15-10-2026"

@e2e exclude Formatting is asserted in tests/utils/userLocale.spec.js against the real Intl; an e2e run cannot set the browser and the Nextcloud locale apart.
