## ADDED Requirements

### Requirement: The flow board inspector edits the selected step's settings and names its outcomes

The inspector MUST show the selected step's set and required settings as editable fields that write to the step as
undoable edits, disabled on a locked flow, and MUST list each outgoing line with its name and target step.

#### Scenario: Choosing a stored decision table
- GIVEN "Welstand nodig?" is selected and its catalogue entry offers stored tables as options
- WHEN the user picks "Parkeerzones" under Beslistabel
- THEN the step's tableRef changes and the flow is marked changed

#### Scenario: Outcomes
- GIVEN lines "Ja" to "Deelzaak welstandsadvies" and "Nee" to "Besluit publiceren"
- THEN the inspector lists "Ja  Deelzaak welstandsadvies" and "Nee  Besluit publiceren"

#### Scenario: Outcomes named by their exit
- GIVEN "Welstand nodig?" has exits "ja" and "nee" and unnamed lines leave by them to "Deelzaak welstandsadvies" and "Besluit publiceren"
- THEN the inspector lists "Ja  Deelzaak welstandsadvies" and "Nee  Besluit publiceren" (an exit's own label wins over its id)

#### Scenario: A stored table named by its key
- GIVEN the step's tableRef is the key "dossiq.welstandsgebieden-zuiddrecht" and the listed tables carry that key
- THEN Beslistabel shows "Welstandsgebieden Zuiddrecht" and lists no extra option for the key

#### Scenario: A locked flow
- GIVEN a retired flow
- THEN the fields are disabled and a write is refused
