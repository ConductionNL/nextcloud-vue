# dynamic-answers-on-edit Delta

## Purpose

An edit form shows and keeps the answers a record already gave to its
data-driven questions.

## ADDED Requirements

### Requirement: The edit form shows the stored answers

A `CnFormDialog` that edits a record SHALL fill every data-driven question of
an `x-openregister-extends-form` declaration with `values.mode: "array"` from
the record's `values.arrayKey` entry whose `values.definitionRef` names that
question's definition. The stored text SHALL be read for the field's type: a
number as a number, a boolean as a boolean, a list or object from its JSON. A
stored answer SHALL win over the definition's default. A question without a
stored answer SHALL open as before.

#### Scenario: A case edited from its page

- **GIVEN** a case whose type asks "Plafond" (number) and "Doelgroep", and whose `properties` holds `{ propertyDefinition: def-1, name: Plafond, value: "50000" }`
- **WHEN** a person opens the edit form of that case
- **THEN** "Plafond" shows 50000 and "Doelgroep" is empty
- @e2e exclude covered by `tests/components/CnFormDialogStoredAnswers.spec.js` through the real CnFormDialog; the definition fetch needs OpenRegister

### Requirement: Saving an edit keeps what was not changed

On confirm, the dialog SHALL put the declaration's answers in its payload's
`values.arrayKey`, merged over the record's stored array: an answer that
changed SHALL replace its entry, an answer that did not change SHALL keep its
stored entry unchanged, an answer that was cleared SHALL lose its entry, and an
entry for a definition the form did not ask SHALL stay.

#### Scenario: One answer changed, one left alone, one not on the form

- **GIVEN** the case above, whose `properties` also holds an entry for a definition its type no longer asks
- **WHEN** the person changes "Doelgroep" to "Sport" and saves
- **THEN** the payload's `properties` holds the stored Plafond entry as it was, the stored entry for the other definition, and `{ propertyDefinition: def-2, name: Doelgroep, value: "Sport" }`
- @e2e exclude covered by `tests/components/CnFormDialogStoredAnswers.spec.js` and `tests/utils/dynamicProperties.spec.js`

#### Scenario: Nothing changed

- **GIVEN** the case above
- **WHEN** the person saves the edit form without changing a question
- **THEN** the payload's `properties` equals the stored array, so a changed-keys save writes nothing for it
- @e2e exclude covered by `tests/components/CnFormDialogStoredAnswers.spec.js`
