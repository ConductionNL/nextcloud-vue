# object-parties Delta

## ADDED Requirements

### Requirement: A party is checked against the accepted kinds in one vocabulary

The parties widget SHALL mark a party as not accepted only when its kind is known not to fit the accepted kinds. When the
accepted kinds name identity shapes, it SHALL compare them with the shapes the listing gives the party's kind. A party
kind that names no shapes SHALL NOT be marked.

#### Scenario: A person on a case whose type accepts pipelinq's Aanvrager

- **GIVEN** a party of kind `person` (shape `naturalPerson`) and the accepted kind `aanvrager` (shapes `naturalPerson`,
  `organization`)
- **THEN** the party is not marked "Kind not accepted here"
