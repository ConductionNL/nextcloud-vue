# stat-widget Delta

## ADDED Requirements

### Requirement: A stat tile can read its limit as a count and show "value of limit"

A stat tile MAY declare `limitSource`, a count of its own (register and schema default to the tile's source). Its
result SHALL be the tile's limit, and a failed read SHALL leave the limit out. A tile MAY declare `limitStyle: "of"`;
the value and the limit SHALL then draw as one headline, "{value} of {limit}", and reaching the limit SHALL NOT tint
the tile.

#### Scenario: Board PqWachtrij

- **WHEN** the queue's tile counts the open unassigned tickets within their deadline (9), with `limitSource` counting
  all open unassigned tickets (12) and `limitStyle: "of"`
- **THEN** the tile reads "Binnen de termijn" over "9 van 12"
- **AND** no "/ 12" and no amber tint
