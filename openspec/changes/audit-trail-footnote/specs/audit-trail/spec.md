# audit-trail Delta

## ADDED Requirements

### Requirement: A history card can end in a line about the record

An audit-trail widget with `content.footnote` SHALL draw that text, translated and filled from the record shown, as a
muted line under the trail inside the card's own box, and SHALL draw nothing when a field it names is empty.

#### Scenario: A case type's history

- **GIVEN** `footnote: "Reference {identifier}"` on a case type whose identifier is ZT-OMV-REG
- **THEN** the Historie card ends in "Kenmerk ZT-OMV-REG"
