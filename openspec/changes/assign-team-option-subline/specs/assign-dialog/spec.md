# assign-dialog Delta: assign-team-option-subline

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [assign-team-option-subline](../../)

## Purpose

A team in the assign dialog says how big it is and what it does.

## ADDED Requirements

### Requirement: A team option reads its member count and description

CnAssignDialog SHALL put under each team option its member count, where the viewer may read it, and the description the
app's configured records hold for that group, joined by " · ", and SHALL leave either out when it is unknown.

#### Scenario: DqOverdragen

- **WHEN** a coordinator types "juri" in Nieuw team
- **THEN** "Juridische zaken" reads "6 leden · bezwaar, beroep en Woo-advies" under its name
