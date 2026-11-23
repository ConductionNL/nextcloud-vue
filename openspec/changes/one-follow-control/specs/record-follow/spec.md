# record-follow

## ADDED Requirements

### Requirement: One Follow control with a notifications switch

The library SHALL offer one Follow control per record (`CnFollowToggle`) bound to `@self.watching`. While the user follows the record, the control SHALL offer a notifications switch bound to `@self.watchNotify` that sends `PUT .../watch` with `{"notify": false}` or `{"notify": true}` and keeps the follow. The switch SHALL be optimistic and SHALL revert with the server's message when the call fails. The switch SHALL NOT be offered when the user does not follow the record or when the register sends no change notifications. `CnDetailPage` SHALL render this control beside the title and SHALL NOT render a star.

#### Scenario: a user keeps following a case but turns its notifications off

- **GIVEN** a detail page of a record the user follows with notifications on
- **WHEN** the user clicks the bell beside Following
- **THEN** `PUT .../watch` is sent with `{"notify": false}`, the control still reads Following, and the bell shows notifications off
- @e2e exclude {component behaviour; asserted by tests/components/CnFollowToggle.spec.js "turns notifications off with PUT .../watch {notify:false}, keeping the follow"}

#### Scenario: the star is gone from the detail page

- **GIVEN** a record whose read carries `@self.favourite` and `@self.watching`
- **WHEN** its detail page renders
- **THEN** only the Follow control shows beside the title
- @e2e exclude {component behaviour; asserted by tests/components/CnDetailPageFavouriteFollow.spec.js "renders only the Follow control, with its notifications switch, never a star"}

### Requirement: Index pages offer one Following lens and a follow column

`CnIndexPage` SHALL offer the personal lenses `watching` (labelled Following), `recent` and `unread`, and SHALL read the deprecated `favourite` lens as `watching`, giving one tab when both are asked for. `showFollowColumn` SHALL add a first, unsortable column with a compact follow toggle per row bound to `@self.watching`; the deprecated `showFavouriteColumn` SHALL add the same column.

#### Scenario: an app that still asks for favourites gets Following

- **GIVEN** an index page configured with `personalLenses: ["favourite", "recent", "watching"]`
- **WHEN** it renders and the user picks the first lens
- **THEN** the tabs read All, Following, Recent, and the list query carries `_watching=true`
- @e2e exclude {component behaviour; asserted by tests/components/CnIndexPagePersonalLenses.spec.js "reads favourite as Following, and asking for both gives one tab"}
