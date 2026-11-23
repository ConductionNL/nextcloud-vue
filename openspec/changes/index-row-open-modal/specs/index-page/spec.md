## ADDED Requirements

### Requirement: A row action can open a modal on the row

A row action of `type: "open-modal"` SHALL open its `target` through the app root's `cnOpenModal` with the row as `object` and the row's key as `objectId`, the action's own `props` winning. Without an app root or a target it SHALL fall back to emitting `@action`. An entity-sourced index SHALL read its rows again when `cn:page:refresh` is signalled while it is mounted.

#### Scenario: Restore a deleted record behind a confirm

- **WHEN** a reader picks the row action `{ type: "open-modal", target: "CnActionDialog", props: { config: { confirm: { request: { url: "/apps/app/api/records/@objectId/restore" } } } } }`
- **THEN** CnActionDialog opens on that row, posts on confirm, shows the server's refusal sentence when it is refused, and the list reads its rows again when it succeeded
