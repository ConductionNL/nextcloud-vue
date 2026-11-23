## ADDED Requirements

### Requirement: The schema rules widget lists and tries a schema's rules

`CnSchemaRulesWidget` SHALL list `/api/schemas/{schema}/rules` with each rule's kind labelled from `/api/rules/vocabulary` (the rule's own kind when the vocabulary lacks it), and SHALL try a rule against `objectId` through `…/rules/{id}/evaluate`, showing the verdict, the operand and the value it read. A 403 on the inventory SHALL be said in a sentence.

#### Scenario: Why did this rule not fire

- **WHEN** a trial answers `{ trace: { verdict: "no_match", operand: "status", operandValue: "open" } }`
- **THEN** the widget says "The rule did not match this object." and "It read status and found open."
