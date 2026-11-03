# detail-page-record-rights Delta

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [detail-page-record-rights](../../)

## Purpose

A detail page follows the rights OpenRegister reports for its record, and can offer the one action that changes them.

## ADDED Requirements

### Requirement: A detail page can read the record's rights

A detail page with `permissions: true` SHALL ask for `@self.can` on its object read, also when `follow` is `false`, and
CnPageRenderer's read of the same object SHALL ask for it too. The rights SHALL reach the widgets below the page as
`cnRecordCan` and the `actions` slot as `can`. Without `permissions` the reads SHALL stay as they are.

#### Scenario: A case page with Follow off

- **GIVEN** a detail page with `permissions: true` and `follow: false`
- **WHEN** it reads its record
- **THEN** the read carries `_extend[]=@self.can`

### Requirement: Edit controls follow the record's update right

On a page with `permissions: true`, while the record's `can.update` is `false`, the page SHALL NOT offer its Edit
button, SHALL leave out the header actions whose `role` is `edit` or `update`, and the data and map widgets SHALL NOT
edit inline. A record without `can`, or a page without `permissions`, SHALL keep every control.

#### Scenario: A group member who is not the handler

- **GIVEN** a case page with `permissions: true` and a record whose `@self.can` is `{ update: false }`
- **WHEN** the page renders
- **THEN** there is no Edit button, no header action with role `edit` or `update`, and no inline editor

#### Scenario: The handler

- **GIVEN** the same page and a record whose `@self.can.update` is `true`
- **THEN** every edit control is there as before

### Requirement: A banner action can run a declared action on the record

A banner action with `declaredAction` SHALL run that OpenRegister declared action on the page's record with
`POST /apps/openregister/api/objects/{register}/{schema}/{id}/actions/{name}`, then refresh the page. It SHALL show only
while the record's `@self.can` grants the action. A banner whose every action is a declared action the record does not
grant SHALL stay hidden.

#### Scenario: Add yourself as handler

- **GIVEN** a banner shown while `@self.can.update` is `false`, with the action `{ label: "Add me as handler", declaredAction: "claim-as-handler" }`
- **AND** a record whose `@self.can` is `{ update: false, "claim-as-handler": true }`
- **WHEN** the reader presses the button
- **THEN** the page posts to `.../actions/claim-as-handler` and reads the record again

#### Scenario: The action is not granted

- **GIVEN** the same banner and a record whose `@self.can` is `{ update: false }`
- **THEN** the banner does not show
