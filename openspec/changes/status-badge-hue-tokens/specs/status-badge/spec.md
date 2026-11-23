# status-badge Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [status-badge-hue-tokens](../../)

## ADDED Requirements

### Requirement: A status tone reads the theme's hue tint and pill text

CnStatusBadge's success, warning, error, info, purple and teal tones SHALL take their ground from
`--nl-color-<hue>-light` and their ink from `--nl-color-<hue>-text` (green, orange, red, blue, purple, teal) when the
theme declares them, and SHALL fall back to their current colours otherwise.

#### Scenario: under the Zuiddrecht set

- **GIVEN** the Zuiddrecht token set
- **THEN** an info tag is #234A78 on #EAF0F7 and a purple tag #4A3F8F on #E8E6F6
