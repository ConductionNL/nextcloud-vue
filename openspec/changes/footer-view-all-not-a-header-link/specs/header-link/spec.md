## ADDED Requirements

### Requirement: A footer view-all is not a header link

A widget definition whose content puts its view-all in the footer (`viewAllPlacement: "footer"`) SHALL declare no
header link through `viewAllRoute`; an explicit `headerLink` SHALL still be used.

#### Scenario: tasks tab
- **GIVEN** a tab whose tasks table has `viewAllRoute` and `viewAllPlacement: "footer"`
- **WHEN** the tab is open
- **THEN** the tab strip SHALL draw no view-all link, and the table SHALL draw it under its rows
