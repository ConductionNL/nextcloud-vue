## ADDED Requirements

### Requirement: An open record shows the outcome its type expects

With `content.expected` set, CnRetentionWidget SHALL read the candidate rules of a record that OpenRegister has not nominated yet, and SHALL show the appraisal, retention period and selection list row they agree on. When the rules disagree it SHALL say the outcome depends on the result. When the rules cannot be read it SHALL show the plain pending facts. The disposal date SHALL stay "decided when it closes".

#### Scenario: every result type destroys after five years
- **GIVEN** an open case whose type's result types all say `vernietigen` after `P5Y`
- **WHEN** the Archiving card renders
- **THEN** it SHALL show Appraisal "Destroy" and Retention period "5 years after the decision"

#### Scenario: the result types disagree
- **GIVEN** result types that destroy and keep
- **WHEN** the Archiving card renders
- **THEN** Appraisal SHALL read "Depends on the result"

### Requirement: The legal hold and the e-Depot transfer are sections

With `content.legalHold` the widget SHALL list the record's active legal holds, or say no legal hold applies. With `content.transfer` it SHALL say whether the record goes to the e-Depot, from the stored appraisal or else the expected one.

#### Scenario: no hold, destroyed
- **GIVEN** an open case without holds whose type destroys it
- **WHEN** the Archiving card renders
- **THEN** it SHALL read "No legal hold" and "Not applicable" for the transfer

### Requirement: A selection list URL reads as its code and name

With `expected.selectionListLookup` the widget SHALL read an agreed selection list URL through the lookup endpoint, once per URL, and SHALL show the URL's last segment when the lookup fails. When the candidate rules name different rows it SHALL say the row depends on the result.

#### Scenario: the VNG row of a Woo request
- **GIVEN** result types that all name the selectielijst URL of 6.1 "Ingewilligd"
- **WHEN** the Archiving card renders
- **THEN** Selection list row SHALL read "6.1, Ingewilligd"
