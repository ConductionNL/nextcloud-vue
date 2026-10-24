## ADDED Requirements

### Requirement: The reader is me on a user filter

The Active line SHALL name the signed-in user "me" on a filter over a `nextcloud-user` property, unless the page's
`filterLabels` names that value.

#### Scenario: Termijn deze week
- GIVEN Pieter applies a view with assignee @me
- THEN the chip reads "Behandelaar: ik"
