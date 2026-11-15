## ADDED Requirements

### Requirement: A representative's row names when the representation ends

When the parties widget is given `representationUntil` (words with `{date}`), a party that represents another party and whose link has a `validUntil` SHALL show a warning pill with those words, `{date}` being the end date as day and short month (with the year outside the current one). A party that represents nobody, a link without an end, or a widget without the words SHALL show no such pill.

#### Scenario: the authorised representative
- **GIVEN** J. van Wijk represents Aannemersbedrijf Van Wijk B.V. and the link ends on 31 December
- **AND** the app's words are "Machtiging tot {date}"
- **THEN** his row ends with the warning pill "Machtiging tot 31 dec"

#### Scenario: a colleague whose link ends
- **GIVEN** Lars de Koning advises until 13 November and represents nobody
- **THEN** his row shows no end pill
