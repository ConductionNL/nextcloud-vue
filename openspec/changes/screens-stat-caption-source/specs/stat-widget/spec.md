# stat-widget Delta: screens-stat-caption-source

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-stat-caption-source](../../)

## Purpose

The line under a KPI number can count something else than the number does.

## ADDED Requirements

### Requirement: A stat tile's caption can carry its own count

When `content.captionSource` is set, the stat tile SHALL read that count, fill `{count}` in the caption with it and
test `captionVariantWhen` against it. While the count is zero the caption SHALL be left out, or read
`captionSource.zeroText` when set. When the count cannot be read the caption SHALL be left out and the tile's value
SHALL still show. A tile without `captionSource` SHALL render as before.

#### Scenario: Requests that wait too long

- **GIVEN** a tile counting 3 pending requests, with caption "{count} wacht al lang" and a `captionSource` whose filter matches 1
- **WHEN** the tile renders
- **THEN** it shows 3, and under it "1 wacht al lang" in the colour of the matching `captionVariantWhen` rule

#### Scenario: Nothing waits

- **GIVEN** the caption's count is 0 and `zeroText` is "Niemand wacht lang"
- **WHEN** the tile renders
- **THEN** the caption reads "Niemand wacht lang" without the rule's colour
