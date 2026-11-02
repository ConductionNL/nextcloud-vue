## ADDED Requirements

### Requirement: A board party row can read its note from the role record

With `content.note` set to `{ from: "roles", field }`, the parties widget SHALL print, as a board row's note, that field of the role row whose `participant` is the party, and SHALL print no note for a party without a role row. Without `content.note` the row SHALL print the link's note. A note that starts in lower case SHALL continue the role with a space; any other note SHALL follow the role after a middot.

#### Scenario: Rollen next to Partijen
- **GIVEN** J. van Wijk's link note reads "Machtiging namens Aannemersbedrijf Van Wijk B.V. · Awb 2:1" and his role record's description "namens Aannemersbedrijf Van Wijk B.V. · Awb 2:1"
- **AND** the Rollen card declares `note: { from: "roles", field: "description" }`
- **THEN** his Rollen row reads "Gemachtigde namens Aannemersbedrijf Van Wijk B.V. · Awb 2:1"

#### Scenario: an organisation's role line
- **GIVEN** Aannemersbedrijf Van Wijk B.V.'s role record's description is "KvK 00001005"
- **THEN** its Rollen row reads "Belanghebbende · KvK 00001005"

### Requirement: A board contact row can lead with the word for its kind

With `kindLabels`, the contacts tab SHALL start a board row's details with the word for the link's `partyKind`, or else for its `kind`, and SHALL start with nothing when neither has a word. A detail widget host SHALL translate every word of a `labels` map in the host's language and keep its keys.

#### Scenario: Partijen
- **GIVEN** the app gives `{ person: "Contact", organisation: "Organisation", colleague: "Colleague" }` and translates them to Dutch
- **THEN** Sanne de Vries (party kind person) reads "Contact · Lindelaan 14 · ingelogd met DigiD"
- **AND** Lars de Koning (party kind colleague) reads "Collega · Mobiliteit en verkeer · lars.dekoning@zuiddrecht.example"
