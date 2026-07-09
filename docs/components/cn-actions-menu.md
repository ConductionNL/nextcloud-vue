import GeneratedRef from './_generated/CnActionsMenu.md'

# CnActionsMenu

`CnActionsMenu` is the shared `…` overflow Actions menu that renders the canonical built-in action trio used across every Conduction surface:

1. **Refresh**
2. **Documentation** (only when a `documentationUrl` is supplied)
3. **Request a feature**

It also auto-mounts the `CnSuggestFeatureModal` for the Request-a-feature default. It's used internally by [`CnWidgetWrapper`](./cn-widget-wrapper) (per-widget menu) and by the page-level headers of [`CnDetailPage`](./cn-detail-page) and [`CnDashboardPage`](./cn-dashboard-page), so widgets and pages stay in lockstep. [`CnActionsBar`](./cn-actions-bar) (list pages) mirrors the same items inline.

Most apps never instantiate `CnActionsMenu` directly — they configure it through the host component's props (`documentation-url`, `show-refresh`, `show-request-feature`, …). Reach for it directly only when building a new surface that needs the same trio.

## Behaviour

- **Refresh** — emits `@refresh` with `{ widgetId, title }`. Unless a host listener calls `event.preventDefault()` on the second handler argument, it then emits on the `@nextcloud/event-bus` channel named by `refreshChannel` (`cn:widget:refresh` for widgets, `cn:page:refresh` for pages).
- **Documentation** — rendered as an `NcActionLink` only when `documentationUrl` is non-empty. Opens the link in a new tab (`target="_blank"` + `rel="noopener noreferrer"`); there is no JS handler.
- **Request a feature** — emits `@request-feature` with `{ widgetId, title }`, then (unless suppressed) opens `CnSuggestFeatureModal` with `app + page + surface` context auto-filled from the `cnAppId` / `cnFeatureRequestRepo` injects provided by `CnAppRoot`. Without a resolvable repo it logs a one-line `console.warn` and skips opening.

The overflow trigger hides itself entirely when no built-in item is visible and no `#action-items` slot content is supplied.

The `data-testid`s are derived from `testidBase`: `<base>-actions` (container), `<base>-action-refresh`, `<base>-action-documentation`, `<base>-action-request-feature`. Each host passes its own base (e.g. `cn-widget-wrapper`, `cn-detail-page`).

## Usage

```vue
<CnActionsMenu
  :widget-id="resolvedId"
  :title="title"
  :surface="`detail:${resolvedId}`"
  :documentation-url="documentationUrl"
  refresh-channel="cn:page:refresh"
  testid-base="cn-detail-page"
  @refresh="onRefresh"
  @request-feature="onRequestFeature">
  <template #action-items>
    <NcActionButton @click="…">Custom action</NcActionButton>
  </template>
</CnActionsMenu>
```

### Slots

| Slot | Description |
|------|-------------|
| `action-items` | Additional `NcActionButton`-family items appended inside the overflow menu, after the built-in Refresh / Documentation / Request-a-feature group. |

### Labels & state props

| Prop | Default | Description |
|------|---------|-------------|
| `documentationLabel` | `t('Documentation')` | Pre-translated label for the Documentation item. |
| `refreshLabel` | `t('Refresh')` | Pre-translated label for the Refresh item. |
| `requestFeatureLabel` | `t('Request a feature')` | Pre-translated label for the Request-a-feature item. |
| `actionsMenuLabel` | `t('Actions')` | Pre-translated aria-label / tooltip for the overflow trigger. |
| `refreshing` | `false` | While true, the Refresh item is disabled and shows a loading spinner — for exactly as long as this stays true, so it reflects the real refresh time. |
| `specRef` | `''` | Forwarded to the auto-mounted CnSuggestFeatureModal. |

## Reference (auto-generated)

The table below is generated from the SFC source via `vue-docgen-cli` and updates automatically whenever the component changes.

<GeneratedRef />
