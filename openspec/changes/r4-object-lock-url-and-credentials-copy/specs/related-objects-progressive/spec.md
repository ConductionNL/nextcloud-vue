# related-objects-progressive Delta: r4-object-lock-url-and-credentials-copy

## ADDED Requirements

### Requirement: Each related section shows when its own request returns

On its tabbed self-fetch path `CnRelatedObjectsWidget` SHALL render each
section (objects, files, the leaf groups from relations) as soon as its own
request returns, in the fixed tab order, without waiting for the other
sections. While another section is still loading it SHALL name the sections
still in flight. A section whose request failed SHALL be named with "Could
not load {section}." while the other sections stay visible. An answer from a
load that a newer load replaced SHALL be dropped. The widget's props and
manifest contract do not change.

#### Scenario: Relations answer before uses and used

- **GIVEN** a lead whose relations answer in 0.45 s and whose uses/used take 9 s
- **WHEN** the detail page opens
- **THEN** the Mails tab and its rows show after the relations answer
- **AND** a line reads "Still loading: Objects" until uses and used return

#### Scenario: The files request fails

- **GIVEN** the files sub-resource answers 500
- **WHEN** the widget loads
- **THEN** the other sections show and the widget reads "Could not load Files."
