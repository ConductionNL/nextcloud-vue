# walkthrough Delta: a-tour-starts-on-the-pages-it-names

**Status**: draft
**Scope**: `CnWalkthrough` auto-start, and the tour shape in the v2 manifest schema.

## ADDED Requirements

### Requirement: A tour MAY name the routes it auto-starts on

A tour that declares `startOn` SHALL auto-start only while the current route name is one of them. Off those routes it SHALL wait and open when the user reaches one. A tour without `startOn` SHALL keep the existing behaviour. A tour started by hand SHALL ignore `startOn`.

#### Scenario: First visit through a link to a case

- **GIVEN** a first-visit tour with `startOn: ["Dashboard"]` and a centered welcome step
- **WHEN** a user who never saw the tour opens a link to a case
- **THEN** no tour opens over the case
- **AND** when they open the dashboard the tour opens at its welcome step

#### Scenario: No startOn

- **GIVEN** the same tour without `startOn`
- **WHEN** the user opens the link to the case
- **THEN** the welcome card opens there, as before
