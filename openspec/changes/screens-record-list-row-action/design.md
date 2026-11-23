# Design: screens-record-list-row-action

- `rowAction` = a manifest action + `label` + optional `labels: { field, map }`. The row's value of `field`, when
  `map` has it, picks the label; otherwise `label`. No label, no action.
- Rendering (`rows` presentation only): the row becomes a `div`. The title is the row link (`rowRoute`), underlined
  as the board draws it. Pills sit in a 120px column, the due text in a 96px right-aligned column, then the action
  (`flex 0 0 150px`, height 34px, radius 17px, `--color-primary-element-light`, weight 600). The row wraps on a
  narrow card.
- `open-page` renders a router link for the row id. `navigate` renders a link after resolving `@object.<field>` /
  `@objectId` against the row; an external target needs no router. Any other type is a `<button>` dispatched through
  `cnDispatchAction`, or `dispatchAction` without a page: `handler` gets the row appended to its args, and
  `open-modal` gets `props.row`.
- `headerCount: true` adds `count: total` to the `header` event (not on a failed read). CnDashboardPage keeps it per
  widget and renders `<span class="cn-dashboard-page__widget-count">` in `title-meta`, beside a date chip when the
  card has one.
- Without the keys, the record list and the card are unchanged.
