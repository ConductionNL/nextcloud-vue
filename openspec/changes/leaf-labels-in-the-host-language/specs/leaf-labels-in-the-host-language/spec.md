## ADDED Requirements

### Requirement: An integration widget gives its leaf labels in the host's language

An `integration` widget MAY declare `labels`, an object of prop name to text. CnDetailWidgetHost MUST translate every text through the host's translate and hand it to the leaf as the prop of that name, both to a component leaf and to a mount-mode leaf. A `props` entry of the same name MUST win. A value that is not a string MUST be ignored.

#### Scenario: A leaf gets the host's wording

@e2e exclude a prop hand-off; the rendered words belong to the leaf and are asserted in its own app. Asserted by tests/components/CnDetailWidgetHostLeafLabels.spec.js.
- **WHEN** a widget declares `labels: { createLabel: "Create a proposal for this ticket" }` on a Dutch page
- **THEN** the leaf receives `createLabel` "Voorstel maken voor dit ticket", on the component path and on the mount path

#### Scenario: Props win over labels

@e2e exclude same reason. Asserted by tests/components/CnDetailWidgetHostLeafLabels.spec.js.
- **WHEN** a widget declares the same name in `labels` and in `props`
- **THEN** the leaf receives the `props` value
