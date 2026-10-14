# detail-widgets-visible-when

## ADDED Requirements

### Requirement: A detail grid widget shows only while its visibleWhen holds for the record

A widget on a detail page whose definition carries `visibleWhen` MUST be drawn
only while that condition holds for the loaded record. A widget without
`visibleWhen` MUST render as it did before. While the record has not loaded,
the widget MUST be left out. In edit mode every widget MUST stay visible.

#### Scenario: a widget limited to one case type is absent on another

- GIVEN a widget with `visibleWhen: { field: "@context.caseType.category", op: "in", value: ["Sociaal domein"] }`
- AND a case whose case type has category "Transparantie"
- WHEN the case page renders
- THEN the widget is not in the grid

#### Scenario: a widget without visibleWhen is unchanged

- GIVEN a widget with no `visibleWhen`
- WHEN the detail page renders
- THEN the widget is in the grid

### Requirement: A detail page can load records a condition names

`visibilityContext` (`{ <name>: { field, register, schema } }`) MUST make the
page read the record whose id the loaded record holds in `field`, and every
`visibleWhen` on the page MUST read it as `@context.<name>`. A record that cannot be
read MUST resolve as absent, so a condition on it fails safe.

#### Scenario: a tab condition reads the case type

- GIVEN a tabs widget whose tab has `visibleWhen: { field: "@context.caseType.documentReview.enabled", op: "eq", value: true }`
- AND a case whose case type does not enable document review
- WHEN the case page renders
- THEN that tab is hidden
