# Proposal: widget-placeholder-shape

## Why

Ruben's decision of 27 November 2026: every dashboard widget declares the shape of its own placeholder, so a page that
draws a widget before its content is there draws the same shape everywhere. Launchpad's server-rendered first paint
(launchpad change `first-paint-skeleton`, boards `launchpad/LpLaden` and `launchpad/LpLadenDeels`) and the widget
wrapper in this library must draw the same placeholder for the same widget, or the page changes shape when the scripts
take over. Conduction widgets all declare one; widgets of other vendors fall back to rows.

Today nothing in the library knows a widget's shape. A widget that is still loading shows a spinner
(`CnWidgetRenderer`, the pending cell of `CnDashboardPage`), and launchpad keeps its own type-to-shape table
(`first-paint-kinds.json`) that only launchpad can read. A table in one host does not reach the next host, and a new
widget type is missing from it until somebody notices.

## What changes

- New capability `widget-placeholder`:
  - A widget declares `placeholder`: one of `rows`, `lines`, `block`, `tiles`, `counter`, `heading`, or
    `{ shape, count }` with a count hint. It can be declared in two places: on the widget type in
    `dashboardWidgetRegistry` (`registerDashboardWidget(type, { ..., placeholder })`), and on a widget declaration in
    the app manifest (`widgetDef.placeholder`, schema 1.9.0). The manifest wins over the registry; a widget that
    declares nothing draws `rows`.
  - A type an app registers declares its shape once, on the registration. That covers every widget of the type, and
    a single widget may override it in the manifest. This is the preferred route for an app's own widget types.
  - New component `CnWidgetPlaceholder` draws one shape, `aria-hidden`, in neutral Nextcloud tokens, with a shimmer
    that stops under `prefers-reduced-motion: reduce`. Its markup and classes are a published contract, so a server
    template (launchpad's first paint) can print the same markup.
  - The library ships the registry's declarations as a JSON file (`dist/widget-placeholders.json`, type to shape) and
    the placeholder CSS as a standalone file (`css/widget-placeholder.css`), so a PHP host reads the same declarations
    and draws the same shape without running JavaScript.
- `widget-wrapper`: `CnWidgetWrapper` gains `loading` and `placeholder` props. While `loading` is true it draws the
  shaped placeholder in place of its content, keeps the content mounted out of sight so it can fetch, and carries
  `aria-busy="true"`. This replaces the spinner for a widget's initial load. A refresh of a loaded widget keeps its
  content and the existing refresh indicator.
- `widget-renderer`: `CnWidgetRenderer` emits `loaded` when its first fetch has settled (success, empty or error) and
  no longer draws a spinner for the initial load; the wrapper draws the placeholder.
- `dashboard-page`: `CnDashboardPage` drives each wrapper's `loading` from the widget's `loaded` event and the
  conditional-widget wait, draws the declared shape instead of "Loading…" in a pending cell, and announces loading in
  one page-level status line instead of one status per widget.

## Out of scope

- Implementation. This change is the spec and the task list.
- Launchpad's own first paint and its fallback table: launchpad change `widget-declared-placeholders`.
- How a Nextcloud dashboard widget (PHP `IWidget`) of a Conduction app declares its shape server-side: hydra ADR-036
  amendment, read by launchpad. This library only accepts the declared value through the widget's descriptor.
- Placeholders for detail-page widgets, settings sections and index pages.

## Affected consumers

All consumers that render dashboards: launchpad (through `CnWidgetWrapper`), dossiq, pipelinq, shillinq, decidiq,
humaniq, portaliq and every app with a `type: "dashboard"` manifest page (through `CnDashboardPage`).

## Backward compatibility

Additive. `loading` defaults to `false` and `placeholder` to `rows`, so a wrapper used without them renders as before.
The schema gains an optional property; manifests that omit it stay valid. The visible change is that a dashboard
widget's initial spinner becomes a rows placeholder until each widget type declares its own shape.

## Theming

Neutral Nextcloud variables only (`--color-background-dark`, `--color-background-darker`, `--color-border`), so dark
mode and the NL Design themes apply. No `--nldesign-*` reference.

## Related

- launchpad `first-paint-skeleton` (D5 placeholder kinds, REQ-FPS-002, REQ-FPS-005) and `widget-declared-placeholders`.
- hydra ADR-036 (universal widget manifest), amendment of 27 November 2026, and ADR-124 (speed is a test).
- Boards `launchpad/LpLaden`, `launchpad/LpLadenDeels`.
