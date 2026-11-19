## ADDED Requirements

### Requirement: The widget dialog can show the host's notices

CnAddWidgetModal SHALL show each entry of its `notices` prop as a note card above the widget's form, of the entry's
`type` when that is `warning`, `info`, `error` or `success`, else `warning`, and SHALL render a `notices` slot in the
same place. Without notices or slot content it SHALL render no notice area.

#### Scenario: a consumed dimension nothing publishes
- **GIVEN** a host that passes `notices: [{ text: "This widget consumes wijkCode but no hierarchy on this dashboard publishes it" }]`
- **WHEN** the dialog opens
- **THEN** a warning note card with that text shows above the form
