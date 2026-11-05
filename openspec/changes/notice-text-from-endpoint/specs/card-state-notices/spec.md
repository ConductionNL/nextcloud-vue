# notice-text-from-endpoint Delta: card-state-notices

**Status**: proposed
**Scope**: nextcloud-vue
**OpenSpec changes**:

- [notice-text-from-endpoint](../../)

## ADDED Requirements

### Requirement: A notice's text can come from an endpoint

A notice (on any surface that draws notices) with `textFrom: { endpoint, field }` SHALL take its text from the value at `field` of that endpoint's answer (`@objectId` / `@object.<path>` tokens resolve as in a visibleWhen endpoint), and SHALL be drawn only while that value is a non-empty string. A failed read SHALL draw nothing.

### Requirement: An index page notice can belong to saved views

An index page `notices` entry with `savedViews: [<id or slug>]` SHALL be drawn only while one of the named saved views is applied (the applied id, `default:<slug>` included, or the view's id, slug or uuid). Without `savedViews` it SHALL show on every view.
