# Design: widget-placeholder-shape

## Context

A dashboard widget draws its frame and title at once and its content when its data is there. Between the two the
library shows a spinner: `CnWidgetRenderer` draws `NcLoadingIcon` while it fetches, and `CnDashboardPage` draws a busy
status with "Loading…" in the cell of a conditional widget whose verdict is not in. Launchpad's first paint draws a
content-shaped placeholder from a table it keeps itself (`first-paint-kinds.json`, launchpad `first-paint-skeleton`
D5). From 27 November 2026 the shape belongs to the widget, not to a host's table.

## Decisions

### D1. Six shapes

The shapes are launchpad's D5 kinds, unchanged, so the two hosts agree:

| Shape | Draws | Count means |
|---|---|---|
| `rows` | rows of a 32 px icon square and two lines, the second shorter | number of rows |
| `lines` | lines of text, the last one shorter | number of lines |
| `block` | one block filling the content area | ignored |
| `tiles` | one square per tile, in the widget's own grid | number of tiles |
| `counter` | a number block and a label line | number of counters side by side |
| `heading` | nothing: the title is the content | ignored |

The enum is closed. A new shape is a change to this spec and to launchpad's shell, because both must draw it.

### D2. Where a widget declares its shape

A widget's shape is resolved in this order, first hit wins:

1. the widget declaration in the app manifest: `widgetDef.placeholder` (an app's own widget, or an override of a
   registry type for one placement);
2. the widget type in `dashboardWidgetRegistry`: `entry.placeholder`, set by the code that registers the type;
3. the descriptor a host passes for a Nextcloud dashboard API widget (`{ placeholder }` on the NC widget descriptor,
   which launchpad fills from the PHP widget's declaration);
4. `rows`.

`placeholder` takes a shape name or an object `{ shape, count }`. The registry stores it the same way. One resolver,
`resolveWidgetPlaceholder(widgetDef, registryEntry, ncDescriptor)`, returns `{ shape, count }` and is the only place
that knows the order, so `CnDashboardPage`, launchpad's `WidgetWrapper` and the JSON export cannot disagree.

A type an app registers itself (for example portaliq's traffic widgets) declares its shape once, on that
registration. It then covers every widget of the type, and one widget may override it with `widgetDef.placeholder`.
That is the preferred route for an app's own types: one declaration per type, not one key per widget.

Every registry type in this library declares a shape (task 2). A unit test fails when a registered type has no
`placeholder`, so a new widget type cannot land without one.

### D3. The same shape on the server

A PHP host cannot run the registry. The build writes `dist/widget-placeholders.json`, `{ "<type>": { "shape": "rows",
"count": 3 } }`, from the registry after every widget has registered, and the package exports it as
`@conduction/nextcloud-vue/widget-placeholders.json`. The placeholder CSS is built as `css/widget-placeholder.css`,
small enough to inline (target under 2 KB minified), and exported too. A host's server template prints the markup of
D4 and inlines that CSS; the browser then draws the same pixels before and after the scripts run.

### D4. Markup contract

```html
<div class="cn-widget-placeholder cn-widget-placeholder--rows" aria-hidden="true" data-shape="rows">
  <div class="cn-widget-placeholder__row">
    <span class="cn-widget-placeholder__icon"></span>
    <span class="cn-widget-placeholder__line"></span>
    <span class="cn-widget-placeholder__line cn-widget-placeholder__line--short"></span>
  </div>
  ...
</div>
```

`lines` repeats `__line` (last one `--short`); `block` is one `__block`; `tiles` repeats `__tile` in a grid of
`--cn-placeholder-tile-size` squares; `counter` is `__number` above `__line--short`; `heading` renders nothing. The
class names and nesting are public: a change to them is a breaking change of this library, noted in the changelog.

### D5. How many rows

When a count is declared, the placeholder draws that many, clipped to the content area (never overflowing it). When
none is declared it fills the content area: rows at 44 px each (32 px icon plus gap), lines at 24 px, tiles as many
as fit in full. The count is computed from the content area's height (a `ResizeObserver` in `CnWidgetPlaceholder`,
the frame height in grid cells on a server). The frame has a fixed height in a grid, so the count never moves
anything.

### D6. The wrapper keeps the content mounted

`CnWidgetWrapper` cannot replace its slot with the placeholder: the slot's renderer is what fetches, and an unmounted
renderer never finishes loading. While `loading` is true the wrapper renders the slot inside a container with
`visibility: hidden` (out of sight and out of the accessibility tree, still laid out and mounted) and the placeholder
absolutely positioned over the content area. When `loading` turns false the placeholder goes and the content shows in
the same frame. Header, title and footer stay as they are.

### D7. Who says a widget is loading

The wrapper does not guess. Its host sets `loading`:

- `CnWidgetRenderer` (Nextcloud API widgets) emits `loaded` once its first fetch settles, with success, empty or
  error. It draws no spinner for that first fetch.
- Library widget renderers that fetch emit `loaded` the same way (launchpad `first-paint-skeleton` task 6 asks for the
  same event). A renderer that does not emit `loaded` counts as loaded after its first render.
- `CnDashboardPage` holds `loading` true per widget until that widget's `loaded`, and for a conditional widget until
  its verdict is in.

A refresh after the first load is not a load: the content stays, and the actions menu shows the existing `refreshing`
indicator.

### D8. One announcement per page

The placeholder is `aria-hidden`; the waiting wrapper carries `aria-busy="true"`; no wrapper has a status of its own.
`CnDashboardPage` renders one visually hidden `role="status"` line that says "Widgets are loading" once while any widget in
the viewport is busy and "All widgets loaded" once at the end, then empties. It behaves like launchpad's status line
(REQ-FPS-005). It changes its text at most once every 2 seconds. A host
with its own status line (launchpad REQ-FPS-005) uses `CnWidgetWrapper` directly and does not get a second one.

### D9. Tokens and motion

Bones are `--color-background-dark` on the wrapper's background, the shimmer runs from `--color-background-dark` to
`--color-background-darker` over 1.8 s. Under `prefers-reduced-motion: reduce` there is no animation. No colour
literal, no `--nldesign-*` variable.

## Risks

1. Drift between the JS and the server markup: the markup contract is pinned by a snapshot test, and launchpad's
   frame-rect e2e compares the two.
2. A widget declares the wrong shape: it looks slightly off for a moment, nothing breaks. The registry test checks
   presence, not taste; the boards decide taste.
3. Wrappers outside dashboards (detail pages) never set `loading`, so they render as before.
