# detail-page Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-quick-actions-from](../../)

## ADDED Requirements

### Requirement: A record can pick its quick actions

A detail page with `quickActionsFrom` SHALL read that path like a `visibleWhen` field. When it holds a list naming
declared `headerActions` ids, those SHALL be the record's quick actions, in that order. An id no header action declares
and an action defined in the data SHALL be dropped. An empty or missing list SHALL keep `quickActions`.

#### Scenario: A youth-care case type

- **GIVEN** the case type lists `["plan-meeting", "message"]` as its quick actions
- **WHEN** a case of that type opens
- **THEN** its quick actions are "Plan a meeting" and "Message"
