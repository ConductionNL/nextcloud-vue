# detail-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-header-row-from-record](../../)

## ADDED Requirements

### Requirement: A record can name its primary action

A detail page with `primaryActionFrom` SHALL read that path like a `visibleWhen` field. When it holds the id of a
declared header action whose own `visibleWhen` shows it to the reader, that action SHALL be the record's primary
button. An id no header action declares, an empty value, or an action hidden by its own `visibleWhen` SHALL leave the
stage's primary action and `primaryAction` in place, so the record's data never widens who may act.

#### Scenario: A complaint leads with its finding

- **GIVEN** the case type names `record-finding` as its primary action
- **AND** the page declares a header action `record-finding` the reader may use
- **WHEN** a case of that type opens
- **THEN** the primary button is "Record finding"

#### Scenario: The declaration cannot widen who may act

- **GIVEN** the case type names `record-finding` as its primary action
- **AND** that action's own `visibleWhen` hides it from the reader
- **WHEN** a case of that type opens
- **THEN** the primary button is the stage's primary action, not "Record finding"

### Requirement: Quick actions can be read from more than one path

A detail page whose `quickActionsFrom` is a list of paths SHALL read them in order and take the first list that names
a declared header action. When none does, `quickActions` SHALL stay.

#### Scenario: The newer key leads the older one

- **GIVEN** `quickActionsFrom` is `["@context.caseType.headerActions", "@context.caseType.quickActions"]`
- **AND** the case type lists only `quickActions`
- **WHEN** a case of that type opens
- **THEN** its quick actions are the ones `quickActions` lists
