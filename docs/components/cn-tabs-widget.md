import GeneratedRef from './_generated/CnTabsWidget.md'

# CnTabsWidget

A widget that holds other widgets, one per tab.

## Why it exists

A case detail page that carries notes, files, related records, sub-records, mail and appointments renders six cards, each with its own header and its own Actions menu, stacked down the page. All six describe one record, and only one of them is being read at a time.

`CnTabsWidget` puts them behind a tab strip. The strip takes over the two things the cards were each doing separately: it shows the title, and it draws the card.

## What the children give up

A child renders through [`CnDetailWidgetHost`](./cn-detail-widget-host.md) with `chrome="bare"`, so it draws no header and no border of its own. Its content fills the panel exactly as it filled its card. The tab label is what the card header used to say.

The Actions menu moves out of the panels and into the tab bar, beside the strip rather than inside it, and rebinds to whichever child is showing. One menu, always acting on what you are looking at. Refresh reaches that child's own fetch over `cn:widget:refresh`, not a sibling's.

The menu renders through the strip's `#nav-end` slot, which is a sibling of the `role="tablist"` element. Anything nested inside a tablist is announced as one of the tabs, so a screen-reader user counting six tabs would otherwise hear seven.

## Usage

Reference it from a manifest placement. `label` and `icon` are optional and fall back to the child widget's own title and icon, so the common case is a list of `widgetId`s:

```json
{
  "id": "case-panels",
  "type": "tabs",
  "content": {
    "ariaLabel": "Case details",
    "tabs": [
      { "widgetId": "case-notes", "label": "Notes" },
      { "widgetId": "case-files", "label": "Files" },
      { "widgetId": "case-related" },
      { "widgetId": "case-sub-cases" }
    ]
  }
}
```

Tab titles are separately configurable for a reason: "Files and attachments" reads fine on a card and is too long once six tabs share the width. [`CnTabsWidgetForm`](./cn-tabs-widget-form.md) edits them in Buildiq edit mode.

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `content` | `Object` | `{}` | The widget config: `{ tabs, ariaLabel }`. `tabs[]` entries are `{ widgetId, label?, icon? }`, or a bare widget-id string. |
| `availableWidgets` | `Array` | `[]` | Every widget definition on the surface, so `content.tabs[]` can reference siblings by id. |
| `objectId` | `String \| Number` | `''` | The bound record's id. |
| `objectData` | `Object` | `null` | The loaded record, or null while it is still being fetched. |
| `objectType` | `String` | `''` | The resolved object-type slug. |
| `schemaObject` | `Object` | `null` | The resolved JSON Schema, needed by a `data` child. |
| `register` | `String \| Object` | `''` | OpenRegister register slug of the surface. |
| `schema` | `String \| Object` | `''` | OpenRegister schema slug of the surface. |
| `store` | `Object` | `null` | The effective object store. |
| `surface` | `String` | `'detail-page'` | Rendering surface forwarded to integration children (AD-19). |
| `integrationContext` | `Object` | `null` | Object context forwarded to integration children. |
| `cnRegistry` | `Object` | `{}` | The consumer's component registry, for custom child widget types. |
| `showRefresh` | `Boolean` | `true` | Show Refresh in the hoisted Actions menu. |
| `showRequestFeature` | `Boolean` | `true` | Show Request a feature in the hoisted Actions menu. |
| `showDocumentation` | `Boolean` | `true` | Show Documentation in the hoisted Actions menu. |
| `documentationUrl` | `String` | `''` | Documentation URL for the hoisted Actions menu. |

## Events

| Event | Payload | Description |
| --- | --- | --- |
| `geo-saved` | `object` | Re-emitted from a geo child that saved a geometry. |
| `open-integration` | `string` | Re-emitted from a related child asking to open an integration. |

## Notes

- **Panels are lazy, and stay mounted.** Each panel is a [`CnTab`](./cn-tab.md) with `lazy`, so a child mounts when its tab is first opened. Six eager panels that each fetch on `mounted()` would fire six requests on page load to answer five questions nobody asked. Once opened, a panel stays mounted, so switching back never refetches.
- **A tab naming a widget that does not exist still renders**, and its panel says which id did not resolve. `content.tabs[]` is hand-authored config, and a typo that silently removes a tab is a typo nobody finds.
- **A tabs widget cannot hold another tabs widget.** Two rows of tabs give the reader no way to tell which row owns the panel, so the config form filters containers out of the picker.

## See also

- [`CnTabs`](./cn-tabs.md) and [`CnTab`](./cn-tab.md) for the strip itself
- [`CnDetailWidgetHost`](./cn-detail-widget-host.md) for how a child is rendered
- [`CnTabsWidgetForm`](./cn-tabs-widget-form.md) for the config form

<GeneratedRef />
