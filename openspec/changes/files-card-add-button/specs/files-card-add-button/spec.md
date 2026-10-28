# files-card-add-button

## ADDED Requirements

### Requirement: A files card can add a file

CnFilesCard MUST show an add button in its header when `addLabel` is set, and MUST attach each picked file to the object, then read the object's files again. Without `addLabel` it MUST show no add button.

#### Scenario: add a file from the card

- GIVEN a files card for a task with `addLabel` "Bestand toevoegen"
- WHEN the user picks brief.pdf
- THEN the card posts brief.pdf to the task's files endpoint
- AND the card lists the task's files again

#### Scenario: no label, no button

- GIVEN a files card without `addLabel`
- THEN its header shows no add button
