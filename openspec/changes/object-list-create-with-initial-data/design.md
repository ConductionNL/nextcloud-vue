# Design: object-list create with initial data

## Component and surface

`CnObjectListWidget` (`src/components/CnObjectListWidget/`), method
`openCreate`, and the `CnFormDialog` it mounts. Kind: code.

## What changes

1. The dialog receives `:register="content.register"` beside `:schema`, so
   `isReferenceField` resolves and a `$ref` renders as a picker.
2. The dialog receives `:initial-data="createInitialData"`, computed from the
   resolved filter: every key that is a property of the schema, with tokens
   already resolved (`@objectId`, `@me`, `@workspace.*`). Operators
   (`deadline[lt]`) and non-schema keys are dropped.
3. A prefilled reference field renders read-only when
   `content.lockFilterFields` is `true` (default `true`), so the child cannot
   be moved off its parent by accident. The value still shows as the resolved
   label.
4. `content.createDefaults` merges over the filter-derived data for values the
   filter cannot express, such as `direction: "outbound"`.
5. The post-confirm merge stays as the last line of defence, unchanged.

## Interaction with `CnRelatedCollections`

`CnRelatedCollections` (REQ-MDRA-2) maps each entry to an object-list widget
and already passes `filter: { client: '@objectId' }`; it inherits the new
behaviour without a change.

## Alternatives considered

- Prefilling only after the dialog opens: rejected, the required check runs
  on the initial data and the picker must be enabled from the first render.
- Passing the whole filter as initial data: rejected, operator keys would
  land as literal property names.
