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

## Completion persistence

`walkthrough.completionConfigKey` names a **per-user preference** holding the last
app version whose tour the user has seen. `CnAppRoot` owns the round trip:

- on mount it `GET`s `/apps/{appId}/api/preferences/{completionConfigKey}` and holds
  the overlay back until the answer arrives, so a returning user never sees the tour
  flash open;
- on completion **or dismissal** (✕, Skip, backdrop, ESC) it `PUT`s
  `{ "value": "<manifest.version>" }` to that same URL, and mirrors it into
  `localStorage` (`cn-walkthrough-seen:{appId}`) so the next boot resolves
  synchronously.

Only `null` / missing / `""` count as "never seen" — a recorded value that happens to
be JS-falsy (`0`, `false`, `"0"`) still means the user has seen the tour.

Omit `completionConfigKey` and persistence stays per-browser (`localStorage` only):
the tour then reopens in a fresh browser profile, which is exactly what breaks e2e
runs. Declare the key.

The helpers are exported for hosts that mount `CnWalkthrough` standalone:
`loadWalkthroughSeenVersion(appId, key)` and
`persistWalkthroughSeenVersion(appId, key, version)`.

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
| `closeLabel` | `string` | `"Close tour"` | Accessible label for the corner ✕ button that ends the tour for good (marks it complete). |
| `translate` | `function` | `null` | Optional translator applied to step title/body/task i18n keys. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `complete` | — | The last step was passed. |
| `dismiss` | — | The user dismissed the tour (backdrop / ESC). |
| `step-change` | `{ stepId, index }` | The active step changed. |
| `advance` | `{ stepId }` | The user advanced the tour. |
| `handoff` | `{ app, url }` | A cross-app hand-off step (`handoff.url`) navigated to another app with a `cn_resume_tour`/`cn_resume_step` token. |

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
