## ADDED Requirements

### Requirement: A template can write the values of a map

A template token `{path|values}` SHALL write the text and number values of the map or list at `path`, in their order, joined by " · ". Empty values and nested maps or lists SHALL be left out. When no value is left the token is empty, so the whole template is empty.

#### Scenario: a variant's attributes
- GIVEN a variant with attributes `{ voor: "Huishouden", containers: "grijze en blauwe containers" }`
- WHEN the column `{attributes|values}` is filled
- THEN it reads "Huishouden · grijze en blauwe containers"
