## ADDED Requirements

### Requirement: A field is named in the reader's language

Wherever the library names a schema property, it SHALL use `titles[<reader's language>]` when present, then the base
language's entry, then `title`, then the property key.

#### Scenario: a Dutch reader
- **GIVEN** `postcode` with `title: "Postal code"` and `titles: { nl: "Postcode" }`
- **WHEN** a reader whose Nextcloud language is Dutch opens the form
- **THEN** the field is labelled Postcode
