# retention-widget Delta: retention-widget

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [retention-widget](../../)

## Purpose

Every record on OpenRegister shows its stored retention decision the same way.

## ADDED Requirements

### Requirement: A record shows its stored retention

The `retention` detail widget SHALL read the record fresh from OpenRegister and SHALL show only what `@self._retention` and `@self.archived` hold, deriving nothing. It SHALL show an error with a retry when the read fails. A record without a nomination SHALL show that it is decided at closure; a nomination with status `unnominatable` SHALL show a warning with its reason. When `statusField` is configured, a mismatch with `@self.archived` SHALL be shown. An admin or a member of `archivistGroups` SHALL be able to ask for a recomputation with a reason; others SHALL see the control disabled.

#### Scenario: A decided case

- **GIVEN** a closed case whose `@self._retention` holds appraisal destroy and disposal date 2033-03-01
- **WHEN** its Archiving tab opens
- **THEN** the widget shows those facts and the rule that decided them

#### Scenario: OpenRegister cannot be read

- **GIVEN** the object read fails
- **THEN** the widget shows an error with a retry, not an empty block
