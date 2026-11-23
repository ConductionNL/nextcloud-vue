# live-check-follow-ups Delta: live-check-follow-ups

**Status**: in-progress
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [live-check-follow-ups](../../)

## Purpose

Fixes found while checking 2.61.0 on a live Nextcloud. Related: the
`link-cards-page` change, WCAG 2.2 AA.

## ADDED Requirements

### Requirement: The manifest schema version moves with its content

`src/schemas/app-manifest-v2.schema.json` SHALL carry a `version` that changes
whenever its content changes. A ledger SHALL record one content hash per
version, and a test SHALL fail when the schema does not hash to the value
recorded for its version, or when its version is lower than a recorded one.

#### Scenario: Content changes, version does not

- **GIVEN** a recorded hash for version 2.43.0
- **WHEN** a property is added to the schema and `version` still reads 2.43.0
- **THEN** the test SHALL fail and name the version to bump

#### Scenario: A recorded version is not replaced

- **GIVEN** a recorded hash for the schema's version and different content
- **WHEN** `npm run update:manifest-schema-hash` runs
- **THEN** it SHALL exit non-zero and leave the ledger as it was

### Requirement: A link card looks like a card

A card on a `links` page SHALL stay a real `<a>`. Its label and description
SHALL NOT be underlined, at rest or on hover, also under a host stylesheet
that underlines every `a` with `!important`. The label SHALL render in the
main text colour and read as the card's title. Hover and keyboard focus SHALL
change the whole card: border and background on hover, a focus ring on
`:focus-visible`.

#### Scenario: A theme underlines every link

- **GIVEN** a host stylesheet with `a { text-decoration: underline !important }`
- **WHEN** a links page renders
- **THEN** the card, its label and its description SHALL compute `text-decoration-line: none`

### Requirement: A page heading clears the navigation toggle

Every page shell of the library that draws its own heading SHALL keep 56px
free at the inline start of that heading, as `CnPageHeader` does, so the
navigation toggle does not cover the first letters. This covers the `links`,
`reports` and `store` pages and the `wiki` page without a sidebar.

#### Scenario: Links page title

- **GIVEN** a links page with a title
- **WHEN** it renders
- **THEN** its header SHALL have an inline start padding of at least 56px

### Requirement: An attention card says when it could not check

A banner with `layout: "attention"` and a `visibleWhen` whose request fails
SHALL render one quiet line saying it could not check, with the reason
available as a tooltip and to assistive technology. It SHALL NOT render the
attention card itself, and it SHALL NOT use an alarm role or colour. On a
dashboard the banner's cell SHALL stay. A request that succeeds with a value
that does not meet the condition SHALL render nothing, as before. A banner
without `layout: "attention"` SHALL stay hidden on failure, as before.

#### Scenario: The count request fails

- **GIVEN** an attention banner whose `visibleWhen` endpoint answers 500
- **WHEN** the dashboard renders
- **THEN** the banner's cell SHALL show "Could not check" and the reason, and no attention card

#### Scenario: The count is zero

- **GIVEN** an attention banner with `visibleWhen` `gt 0` and a count of 0
- **WHEN** the dashboard renders
- **THEN** nothing SHALL render for the banner

### Requirement: A page below a list marks one menu entry

When the current route is a page below a menu entry's route (its path starts
with that entry's page path) and the existing rules mark no entry on that
route, `CnAppNav` SHALL mark exactly one entry on it: the entry that was last
active on that route in this session, else the first one in menu order. On the
route itself the rule of `link-cards-page` stays as it is.

#### Scenario: Every entry on the list carries a query

- **GIVEN** entries "My work" and "Queue", both on route `Cases` with a `query`
- **WHEN** the address is `/cases/123` and the reader came from "Queue"
- **THEN** only "Queue" SHALL be active

#### Scenario: A cold load of a detail page

- **GIVEN** the same entries and no earlier navigation
- **WHEN** the address is `/cases/123`
- **THEN** only the first entry in menu order SHALL be active

#### Scenario: An entry without a query exists

- **GIVEN** entries "My work" (with a `query`) and "All cases" (without) on route `Cases`
- **WHEN** the address is `/cases/123`
- **THEN** only "All cases" SHALL be active, as before
