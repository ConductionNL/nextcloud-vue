# record-list-value-labels Delta: screens-record-list-value-labels

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [screens-record-list-value-labels](../../)

## Purpose

Let a record list show a label for a stored value in its texts.

## ADDED Requirements

### Requirement: A record-list template can show a label for a stored value

A `record-list` with `valueLabels` (`{ <field>: { <stored value>: <label> } }`) SHALL fill its templates with the
label, through the host's translate, for a field whose stored value the map names, and with the stored value
otherwise. The pill, the badges and the sort SHALL keep reading the stored value.

#### Scenario: Two spellings of one channel

- **GIVEN** tickets with channel "phone" and "telefoon", and `valueLabels: { channel: { phone: "Phone", telefoon: "Phone" } }`
- **WHEN** the meta line is `{client} · {channel}` for a Dutch user
- **THEN** both rows read "… · Telefoon"
