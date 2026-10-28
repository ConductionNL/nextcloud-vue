# timeline-widget Delta: timeline-label-reads-a-reference

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [timeline-label-reads-a-reference](../../)

## Purpose

A history line can name a related record by its name.

## ADDED Requirements

### Requirement: A label can name the record a reference points at

The timeline SHALL read `content.resolve` (`{ <field>: { register?, schema, labelField? } }`) and SHALL fill a label's
`{object.<field>}` with the label of the record the field's id points at. While that label is not known, or cannot be
read, the token SHALL read the id.

#### Scenario: Board PqEvenement

- **GIVEN** an event whose `campaign` is the id of the campaign "Warmtenet Oost 2026"
- **WHEN** the history words its creation "Event created in campaign {object.campaign}" with `resolve.campaign`
- **THEN** it reads "Event created in campaign Warmtenet Oost 2026"
