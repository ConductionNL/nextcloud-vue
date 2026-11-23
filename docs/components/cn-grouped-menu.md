# CnGroupedMenu

One "More" button whose menu lays a page's actions out in titled groups over one or two columns. It replaces a row of separate icon menus with one entry point, without a second level.

```vue
<CnGroupedMenu
  label="Meer"
  :columns="[
    [{ id: 'boards', title: 'Dashboards', items: dashboards }],
    [{ id: 'this', title: 'Dit dashboard', items: actions }],
  ]" />
```

`columns` is an array of columns, each an array of groups `{ id, title?, divided?, items }`. An item is `{ id, label, icon?, meta?, checked?, destructive?, disabled?, href?, target?, to?, onClick? }`. An `href` renders a link, a `to` a router link, anything else a button. `checked` makes the item a radio item, for "which one is open". `meta` is a short muted note at the right. Empty groups and columns are not drawn.

The menu is a WAI-ARIA menu. The arrow keys move through every item over both columns, Home and End jump to the first and the last, and Escape closes it and returns focus to the button.

## Reference

### Props

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `columns` | `Array<Array<object>>` | `[]` | The columns of groups. |
| `label` | `string` | `'More'` | The button's text and the menu's name. |
| `variant` | `string` | `'secondary'` | The button's NcButton variant. |

### Events

| Name | Payload | Description |
| --- | --- | --- |
| `select` | `object` | An item was chosen. |
| `open` | | The menu opened. |
