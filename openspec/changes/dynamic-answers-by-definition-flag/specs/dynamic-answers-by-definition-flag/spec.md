# dynamic-answers-by-definition-flag

## ADDED Requirements

### Requirement: A declaration routes flagged answers to their own array

An array-mode declaration with `values.arrayKeyBy: { field, keys }` SHALL store the answer to a
definition whose `field` value (as text) is a key of `keys` in the array `keys` names, and every
other answer in `arrayKey`. The edit form SHALL show stored answers from every routed array, and
saving SHALL merge each answer into its own array, keeping what that array held.

#### Scenario: A flagged answer is saved apart
- **GIVEN** a declaration routing `sensitive: true` definitions to `sensitiveProperties`
- **WHEN** a person answers a sensitive field and an ordinary one
- **THEN** the sensitive answer SHALL be in `sensitiveProperties` and the ordinary one in `properties`

#### Scenario: A reader without the second array edits safely
- **GIVEN** a record read without `sensitiveProperties` (stripped by the server)
- **WHEN** the edit form opens
- **THEN** the sensitive fields SHALL show no stored answer
