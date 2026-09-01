import GeneratedRef from './_generated/CnDetailWidgetHost.md'

# CnDetailWidgetHost

Renders one detail-page widget definition, with or without card chrome.

## Why it exists

This was a 230-line `v-if` chain inside [`CnDetailPage`](./cn-detail-page.md)'s grid slot. It moved out when a second surface needed it: [`CnTabsWidget`](./cn-tabs-widget.md) renders the same widget definitions inside tab panels, without the cards.

Two copies of "which renderer does this type get" is the kind of thing that drifts. A type added to one and not the other renders correctly on the page and blank in a tab, with nothing in the console either way. That is how 101 of hrmq's 236 detail widgets went missing once, when the dashboard catalog and `BUILT_IN_WIDGETS` were two near-disjoint vocabularies.

The pure decisions live in `utils/widgetDispatch.js`, which both surfaces import. This component is the markup that acts on them.

## The two chrome modes

`chrome="card"` is the detail-page grid: every widget gets a titled card, because ADR-062 rule 5 says every body widget carries chrome and its manifest title.

`chrome="bare"` is a tab panel. The strip already shows the title and draws the card, so a second title inside the panel reads as a heading nested in its own heading. Bare mode drops the wrapper and, for an integration leaf, renders the provider's `tab` (its bare content) rather than its `widget` (which draws its own card). That pairing is not new: `CnIntegrationWidget` already does exactly this inside its own panels.

## What bare mode deliberately does not strip

The `data` widget keeps its chrome in both modes. `CnWidgetWrapper` renders its actions inside the header, and `CnObjectDataWidget` puts its **Save** button there, so suppressing the header to remove a duplicate title would also remove the only way to commit an inline edit. A silently unsaveable form is worse than a doubled title.

## Usage

```vue
<CnDetailWidgetHost
  :widget="def"
  chrome="bare"
  :object-id="id"
  :object="record"
  register="dossiq"
  schema="case" />
```

## Props

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `widget` | `Object` | required | The resolved widget definition: `{ id, type, title, icon, content }`, plus `integrationId` for `type: 'integration'`. |
| `chrome` | `String` | `'card'` | `'card'` for a titled `CnWidgetWrapper`, `'bare'` when the caller owns the title and the card. |
| `objectId` | `String \| Number` | `''` | The bound record's id. Present on the first render, unlike `object`. |
| `object` | `Object` | `null` | The loaded record, or null while it is still being fetched. |
| `objectType` | `String` | `''` | The resolved object-type slug. |
| `schemaObject` | `Object` | `null` | The resolved JSON Schema, needed by the `data` widget. |
| `register` | `String \| Object` | `''` | OpenRegister register slug of the surface. |
| `schema` | `String \| Object` | `''` | OpenRegister schema slug of the surface. |
| `store` | `Object` | `null` | The effective object store. |
| `surface` | `String` | `'detail-page'` | Rendering surface forwarded to integration widgets (AD-19). |
| `integrationContext` | `Object` | `null` | Object context forwarded to integration widgets. The surface derives this: see the note below. |
| `hideEmpty` | `Boolean` | `false` | Hide empty properties in the `data` widget. |
| `availableWidgets` | `Array` | `[]` | Every widget definition on the surface. Only a container type receives it; a leaf widget has no business knowing what else is on the page. |
| `showCardTitle` | `Boolean` | `null` | Whether a card widget draws the wrapper header. Null means decide from the definition. |
| `cnRegistry` | `Object` | `{}` | The consumer's component registry, consulted before the built-in catalog so a custom type overrides a built-in. |

## Events

| Event | Payload | Description |
| --- | --- | --- |
| `geo-saved` | `object` | The geo widget saved a geometry. |
| `open-integration` | `string` | The related widget asked to open an integration. |

## Notes

- **`integrationContext` is derived by the surface, not here.** `CnDetailPage` falls back through its resolved sidebar config and `sidebarProps` before its own register/schema. Deriving from `register`/`schema` alone hands the widget two empty strings.
- **`showCardTitle` is a prop, not a computed.** The rule reads the layout item's `showTitle`, and only the surface holds the layout. Deriving it from the widget definition alone silently drops `showTitle: false`, which is the one way a consumer can stop a card printing its title twice.
- **The `cn-detail-page__card-fit` and `cn-detail-page__catalog-card` class names kept their old prefix** although the markup moved here. `src/css/detail-page.css` targets them and so may consumer CSS.
- **An unresolvable type renders nothing**, which is what `CnDetailPage` has always done at this point. Surfacing a placeholder would be more honest, but this is the slot fallback for every detail page in the fleet, so an app that declares a custom widget and omits its `#widget-<id>` slot would start showing a box where it shows nothing today.

## See also

- [`CnDetailPage`](./cn-detail-page.md), the card-mode surface
- [`CnTabsWidget`](./cn-tabs-widget.md), the bare-mode surface

<GeneratedRef />
