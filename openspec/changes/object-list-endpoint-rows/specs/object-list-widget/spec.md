## ADDED Requirements

### Requirement: A list can read its rows from an app endpoint

A list without register and schema SHALL read its rows from `content.endpointSource`, its params resolved against the record, rows at `responsePath` (default `results`) and the count at `total`. An `export` with a `url` SHALL download that app endpoint, its params resolved the same way, shown only to the named group.

#### Scenario: the assistant's records on a case
- **GIVEN** a list with endpointSource hermiq's subject route and `subjectId: "@objectId"`
- **WHEN** it is shown on case-1
- **THEN** it SHALL request the route with subjectId case-1 and show the answer's results

#### Scenario: the download for the oversight role
- **GIVEN** the list's export names hermiq's subject export and group ai-oversight
- **WHEN** a member of ai-oversight opens case-1
- **THEN** the card's Download SHALL open the export URL with subjectId case-1
- **AND** a reader outside the group SHALL see no Download
