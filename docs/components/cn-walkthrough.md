# CnWalkthrough

Abstract, manifest-driven product walkthrough (ADR-043). Renders a
`manifest.walkthrough` tour as a gray dimmer with a **spotlight cutout** around one
real, interactive element, plus an auto-positioned coachmark card. The element stays
clickable in place — the dimmer is four strips framing the target rect, so it works
inside `overflow:hidden` / transformed ancestors where a `z-index` bump would fail.

Step advancement is declarative: the component sources signals (route change via
`$router`, a `cn-walkthrough:object-created` window event, an appearing element via
`MutationObserver`, a click on the target, or a delay) and feeds them to
[`useWalkthrough`](../utilities/composables/use-walkthrough.md), which captures route
params / object ids into a context bag interpolated into later steps via `{{var}}`.

[`CnAppRoot`](./cn-app-root.md) auto-mounts it over the live shell (non-gating) when
the manifest declares an enabled `walkthrough`; you can also mount it standalone.

## Usage

```vue
<CnWalkthrough
  :app-id="'pipelinq'"
  :manifest="manifest"
  :seen-version="seenVersion"
  :translate="t"
  @complete="onComplete"
  @dismiss="onDismiss" />
```

## Manifest

```jsonc
"walkthrough": {
  "enabled": true, "version": 1, "completionConfigKey": "walkthrough_seen_version",
  "tours": [{
    "id": "getting-started", "trigger": "first-visit",
    "steps": [
      { "id": "welcome", "placement": "center", "sinceVersion": "1.0.0",
        "title": "...", "body": "...",
        "target": { "kind": "page", "ref": "Products" },
        "advanceOn": { "type": "manual" } },
      { "id": "create-product", "sinceVersion": "1.0.0",
        "body": "...", "task": "Click New product",
        "target": { "kind": "element", "ref": "products-add" },
        "advanceOn": { "type": "object-created", "register": "pipelinq", "schema": "product",
                       "capture": { "productId": ":id" } } }
    ]
  }]
}
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `appId` | `string` | — (required) | The Nextcloud app id (walkthrough machine cache key). |
| `manifest` | `object` | `null` | The app manifest; `manifest.walkthrough` + `manifest.version` are read. |
| `seenVersion` | `string` | `''` | The user's last-seen app version (drives "what's new" composition). |
| `tourId` | `string` | `''` | Force a specific tour id; when empty the auto-start tour is used. |
| `resume` | `object` | `null` | Resume token `{ tourId, stepId }` (refresh / cross-app hand-off). |
| `zIndex` | `number` | `10000` | Stacking order of the overlay. |
| `nextLabel` / `backLabel` / `skipLabel` / `finishLabel` | `string` | localized | Control labels. |
| `translate` | `function` | `null` | Optional translator applied to step title/body/task i18n keys. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `complete` | — | The last step was passed. |
| `dismiss` | — | The user dismissed the tour (backdrop / ESC). |
| `step-change` | `{ stepId, index }` | The active step changed. |
| `advance` | `{ stepId }` | The user advanced the tour. |

## Slots

| Slot | Scope | Description |
|------|-------|-------------|
| `coachmark` | `{ step, index, total, next, back, skip }` | Override the whole coachmark body. |

## Accessibility

Moves focus to the coachmark controls, dismisses on ESC, and announces each step via
an `aria-live` region. Targets are scrolled into view before spotlighting.

## Target kinds

`nav-item` / `page` (route name), `widget` (widgetKey), `action` (action id),
`element` (`data-walkthrough-id`, falling back to `data-testid`), `selector` (raw CSS).
The resolver prefers stable manifest identities over CSS.
