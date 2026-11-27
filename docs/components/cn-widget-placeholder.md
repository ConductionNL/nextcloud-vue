import GeneratedRef from './_generated/CnWidgetPlaceholder.md'

# CnWidgetPlaceholder

The shape a dashboard widget waits in while its content loads: rows, lines, one block, tiles or a counter, drawn in grey with a calm shimmer. It replaces the spinner, so a dashboard keeps its layout while widgets load and nothing jumps when the content arrives.

## Usage

```vue
<CnWidgetPlaceholder shape="rows" />
<CnWidgetPlaceholder :shape="resolved.shape" :count="resolved.count" />
```

Without a `count` the placeholder fills its container: rows at 44 px each (a 32 px icon square and two lines), lines at 24 px, as many whole tiles as fit. With a `count` it draws that many, clipped to the container, so it never overflows. `heading` renders nothing: the title is the content.

The placeholder is `aria-hidden`. Its host announces loading once for the page (CnDashboardPage's status line), so no widget speaks on its own.

## Where the shape comes from

A widget declares its shape; `resolveWidgetPlaceholder(widgetDef, registryEntry, ncDescriptor)` picks the first of:

1. `placeholder` on the manifest widget (`widgetDef.placeholder`, schema 1.9.0), for one widget;
2. `placeholder` on the widget type's registration (`registerDashboardWidget(type, { placeholder })`), for every widget of the type. This is the route for an app's own widget types: declare it once on the registration;
3. `placeholder` on the descriptor of a Nextcloud dashboard API widget (a host fills it from the PHP widget's `getPlaceholder()`);
4. `rows`.

A declaration is a shape name (`rows`, `lines`, `block`, `tiles`, `counter`, `heading`) or `{ shape, count }` with `count` 1 to 24. `registerDashboardWidget` throws a `TypeError` for anything else. Every widget type this library registers declares one.

## On a server

A server template can draw the same placeholder before any script runs: print the markup below and inline `@conduction/nextcloud-vue/css/widget-placeholder.css` (about 1.4 KB minified). The shapes of the library's widget types are in `@conduction/nextcloud-vue/widget-placeholders.json`, `{ "<type>": { "shape": "rows" } }`.

```html
<div class="cn-widget-placeholder cn-widget-placeholder--rows" aria-hidden="true" data-shape="rows">
  <div class="cn-widget-placeholder__row">
    <span class="cn-widget-placeholder__icon"></span>
    <span class="cn-widget-placeholder__line"></span>
    <span class="cn-widget-placeholder__line cn-widget-placeholder__line--short"></span>
  </div>
</div>
```

`lines` repeats `__line` (the last one `--short`), `block` is one `__block`, `tiles` repeats `__tile` (sized by `--cn-placeholder-tile-size`, default 64 px), `counter` repeats `__counter`, each a `__number` above a `__line--short`. These class names and their nesting are public: changing them is a breaking change.

Bones use `--color-background-dark`, shimmering to `--color-background-darker` over 1.8 s; under `prefers-reduced-motion: reduce` there is no animation.

<GeneratedRef />
