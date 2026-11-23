# open-modal-props-tokens Delta: actions

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [open-modal-props-tokens](../../)

## Purpose

A dialog opened from a record's page knows which record it is about.

## ADDED Requirements

### Requirement: An open-modal action resolves its prop tokens

When the dispatch context carries a token context, an `open-modal` action SHALL resolve each prop that is exactly a token (`@objectId`, `@object.<field>`) against it, at any depth, and SHALL leave a token it cannot resolve as written. CnActionDialog SHALL read the record id from the route's `id` when its `objectId` is empty or still a token.

#### Scenario: Archive from the case page

- **GIVEN** a case page action `{ type: "open-modal", target: "CnActionDialog", props: { objectId: "@objectId" } }`
- **WHEN** it is dispatched on case z-82
- **THEN** the dialog opens with `objectId` z-82
