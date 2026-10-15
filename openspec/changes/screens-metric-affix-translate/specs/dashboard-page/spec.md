# dashboard-page Delta: screens-metric-affix-translate

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-metric-affix-translate](../../)

## Purpose

A stat's prefix and suffix read in the user's language, like its label.

## ADDED Requirements

### Requirement: A metric prefix and suffix are translated

When a stat, stats-block entry, delta or gauge formats its value with a `format.prefix` or `format.suffix` that is a
literal string, the library SHALL run that string through the host app's translate function (`cnTranslate`, or the
widget's `translate` prop) before it joins the value. A prefix or suffix that is a `@config.<key>` or
`@object.<field>` token SHALL be resolved as before and SHALL NOT be translated. Without a translate function the
affix SHALL render as written.

#### Scenario: A Dutch suffix

- **GIVEN** a stat with `format: { style: "decimal", decimals: 1, suffix: " days" }` and a host translate that maps
  " days" to " dagen"
- **WHEN** the value 1.5 renders in the nl locale
- **THEN** the tile reads "1,5 dagen"
