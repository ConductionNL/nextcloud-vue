# stat-widget Delta: stat-caption-ratio

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [stat-caption-ratio](../../)

## Purpose

A stat tile's caption can say what share of a total the tile is.

## ADDED Requirements

### Requirement: A stat tile's caption can show a share

A stat tile with `captionSource.kind: "ratio"` SHALL read the `denominator` part, and the `numerator` part when one is
named, each with its own `metric`, `field`, `filter` and `via`, against the caption source's register and schema (by
default the tile's). The share SHALL be the numerator (the tile's own value when no numerator is named) over the
denominator, times 100. `{ratio}` and `{count}` in the caption SHALL read the share with `decimals` fraction digits (0 by
default) in the reader's locale. A zero or unread denominator SHALL leave the caption out. A `captionSource` without
`kind` SHALL count as before.

#### Scenario: An age bucket's share of the open total

- **GIVEN** a tile summing `grossAmount` of the invoices 1 to 30 days late (EUR 14.320) with `caption: "{ratio}% van open"` and a ratio caption source whose denominator sums `grossAmount` of all open invoices (EUR 96.410)
- **WHEN** the tile renders
- **THEN** the caption under the amount reads "15% van open"

#### Scenario: No total

- **GIVEN** the denominator reads 0
- **WHEN** the tile renders
- **THEN** no caption is shown
