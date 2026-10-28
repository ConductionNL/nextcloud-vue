## ADDED Requirements

### Requirement: A widget can be drawn on a phone only or a wide screen only

A dashboard widget with `viewport: "narrow"` MUST only draw when the window is under 640px wide. One with `viewport: "wide"` MUST only draw from 640px up. A widget that does not draw MUST give up its grid cell. A widget without `viewport` MUST draw on both.

#### Scenario: My work on a phone
- GIVEN My work with a phone list (`viewport: "narrow"`) and three desk lists (`viewport: "wide"`)
- WHEN the page opens 375px wide
- THEN only the phone list draws
