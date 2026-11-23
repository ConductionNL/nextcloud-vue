## ADDED Requirements

### Requirement: The share picker can be limited to the reader's groups

The saved-view share picker SHALL offer only the groups the current user is in when `shareGroups` is `mine`, only the
named groups when it is an array of group ids, and every group the sharee API answers when it is `all` or unset. People
SHALL stay pickable in every case.

#### Scenario: a team lead shares a view
- **GIVEN** an index page with `savedViewsShareGroups: "mine"` and a reader in group Vergunningen only
- **WHEN** the reader opens the share picker of a saved view
- **THEN** Vergunningen is offered and no other group is
