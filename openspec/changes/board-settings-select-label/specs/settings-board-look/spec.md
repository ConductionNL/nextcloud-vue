## ADDED Requirements

### Requirement: a select in a board settings card has its label above the control

In a board settings card a labelled NcSelect MUST make room above itself for its label, and the label MUST stand above the control without overlapping what stands above the select. The text-field label rules MUST NOT apply to a select's inner field.

#### Scenario: the Register select on DqInstellingen
- GIVEN a settings card with a text field followed by a labelled select
- THEN the select's label sits between the text field and the select, 14px/600
