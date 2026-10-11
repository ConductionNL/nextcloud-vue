# CnSectionsWidget

Several widgets in one place, each under its own heading. Registered under the `sections` widget type.

A tab strip binds one widget per tab, and a tab often holds more than one thing: a case's documents list and its folder, a portal's details form, house style and sign-in settings. Before this widget each app wrote a component that stacked its own panels (dossiq `CaseSectionsWidget`, portaliq `PortalSettings`). Now the manifest lists the sections.

Two looks:

- **Headed sections** (default): a heading per section and a 1px rule between sections, inside the tab panel (DqZaak's folded tabs).
- **Cards** (`cards: true`): one card per section, optionally in a main and a side column (`column: "side"`), 20px apart, the side column at most 418px (PtPortalInstellingen).

A single column of separate titled cards in a tab is also the tabs widget's own `widgetIds` stack (see [CnTabsWidget](./cn-tabs-widget.md)); use `sections` for headed sections, and for the two-column card grid a settings tab draws.

## Content shape

```json
{
  "id": "portal-settings",
  "type": "sections",
  "content": {
    "cards": true,
    "sections": [
      { "title": "Gegevens van de portal", "widgetId": "portal-details" },
      { "title": "Huisstijl", "widget": { "type": "PortalTheme" } },
      { "title": "Verkeer meten", "column": "side", "widgetId": "portal-traffic-settings" }
    ]
  }
}
```

| Key | Meaning |
|-----|---------|
| `sections[]` | `{ key?, title?, description?, column?, widget? \| widgetId? }`, in order. `label` is an alias of `title`. `widget` is any widget definition; `widgetId` names a sibling definition on the same surface. A section whose widget is missing or whose id names nothing is skipped (the id case with a console warning). |
| `sections[].column` | `main` (default) or `side`. One `side` section makes the layout two columns. |
| `cards` | One card per section (default `false`: headings and a rule). |
| `hideEmpty` | A section whose widget draws nothing shows no heading and takes no space (default `true`). Its widget stays mounted, so it can still fetch and fill later. |

Titles and descriptions go through the host app's `cnTranslate`.

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `content` | `object` | `{}` | The configuration above. |
| `availableWidgets` | `object[]` | `[]` | Sibling widget definitions, for `widgetId` sections. The detail page and the tabs widget pass them (it is a container type). |
| `objectId` | `string\|number` | `''` | The bound record's id, forwarded to every child. |
| `objectData` | `object` | `null` | The loaded record, forwarded to every child. |
| `objectType` | `string` | `''` | The object-type slug, forwarded. |
| `schemaObject` | `object` | `null` | The JSON Schema, needed by a `data` child. |
| `register` | `string\|object` | `''` | Register slug of the surface. |
| `schema` | `string\|object` | `''` | Schema slug of the surface. |
| `store` | `object` | `null` | The object store, forwarded. |
| `surface` | `string` | `'detail-page'` | Rendering surface, forwarded. |
| `integrationContext` | `object` | `null` | Object context for integration children. |
| `cnRegistry` | `object` | `{}` | The app's component registry, for custom child types. |

## Notes

- Children render through `CnDetailWidgetHost` in bare mode, the dispatch a tab panel uses, so a child behaves here as it does in a tab.
- Stacked children share one cell, so an object list in a section renders every fetched row: the widget sets `content.fit: false` on a child that does not set `fit` itself.
- "Draws nothing" means no text (an empty state is text, so it counts as content) and no image, svg, canvas, table or form control.
- Each shown section is labelled by its heading (`aria-labelledby`).
- The tabs widget now passes its sibling definitions to a panel's widget, so a `sections` widget inside a tab can use `widgetId`.
- Renderer only: no config form; detail pages only.
