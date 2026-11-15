## ADDED Requirements

### Requirement: A change label can say from what to what

A change label SHALL fill `{from}` and `{to}` with the old and new value the entry recorded for the matched rule's
`field`, in `valueLabels` words. With `values: "user"` or `"group"` on the rule they SHALL read as the display name of
the recorded id, and as the id while the name loads. `{from}` SHALL be empty when the entry recorded only a new value.

#### Scenario: a ticket handover
- **GIVEN** the rule `{ field: "assignee", values: "user", label: "Passed to {to} by {actor}" }`
- **WHEN** an entry records `assignee` from `lotte` to `samira`
- **THEN** the History card reads "Passed to Samira Haddou by Lotte Mulder"

### Requirement: A change rule can show a note under its entry

A change rule with `note` SHALL show, under the entry it words, the new value the entry recorded under that key, and
nothing when the entry recorded none.

#### Scenario: the reason of a handover
- **GIVEN** the rule above with `note: "handoverNote"` and an entry that records `handoverNote` "Customer calls back Monday"
- **THEN** that sentence shows under the handover entry
