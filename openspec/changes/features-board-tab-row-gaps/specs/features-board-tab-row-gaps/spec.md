# features-board-tab-row-gaps Delta: features-board-tab-row-gaps

## ADDED Requirements

### Requirement: The features board's tab row keeps the board's gaps and 34px Actions menu

Under the board look, CnFeaturesBoard SHALL draw its tabs 4px apart and its status chips 8px apart whatever margin the platform sheet gives a plain button, and SHALL draw the Actions menu beside the tabs 34px tall with 12px padding, not as the 40px labelled header menu.

#### Scenario: PqRoadmap tab row

- **GIVEN** the features page with the tabs Functies and Roadmap, the status chips and the Actions menu
- **WHEN** it renders under the board look on Nextcloud
- **THEN** the tabs stand 4px apart, the chips 8px apart, and the Actions menu is 34px tall with 12px padding
