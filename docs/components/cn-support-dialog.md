---
sidebar_position: 43
---

# CnSupportDialog

A first-open "support this project" modal every Conduction app can mount from `@conduction/nextcloud-vue`. Personal note in the Conduction voice, signed by the founder in a handwritten font, with four CTAs in a deliberate priority order:

1. **Suggest a feature** — primary. Framed as the single most valuable contribution.
2. **Review on App Store** — secondary. Helps other people find the app.
3. **Donate** — tertiary. Defaults to ConductionNL GitHub Sponsors.
4. **Get support** — tertiary. Routes organisations to a Conduction support partner (Host / Service / Certified). Conduction does not sell direct support — the apps stay free and support runs through partners. Defaults to `https://www.conduction.nl/support`.

The dialog is paired with [`useSupportDialog`](./use-support-dialog.md) — a composable that persists the dismissed state per `appSlug` in `localStorage` so users only see the note the first time they open an app.

The same dialog is also wired up automatically as the fourth container of [`CnFeaturesAndRoadmapSidebar`](./cn-features-and-roadmap-sidebar.md) ("Support this project" → "Show support note"), so users who dismissed the first-open prompt can always get back to it from the roadmap surface every Conduction app already mounts.

## Try it

```vue
<template>
  <div>
    <NcButton @click="show = true">Show support note</NcButton>

    <CnSupportDialog
      v-if="show"
      app-name="Decidesk"
      app-slug="decidesk"
      app-store-url="https://apps.nextcloud.com/apps/decidesk"
      feature-request-url="https://github.com/ConductionNL/decidesk/issues/new"
      @close="show = false" />
  </div>
</template>

<script>
import { CnSupportDialog } from '@conduction/nextcloud-vue'

export default {
  components: { CnSupportDialog },
  data() { return { show: false } },
}
</script>
```

## Fleet auto-mount via CnAppRoot (default)

Apps that mount [`CnAppRoot`](./cn-app-root.md) get the first-open note **automatically** on a lib bump — no per-app wiring. `CnAppRoot` derives the slug/name/App-Store/feature-request URLs from `appId` and persists the "seen" flag **per-user** (server preferences endpoint, localStorage fallback). Opt out with `:support-dialog="false"`, or override copy/URLs with an object:

```vue
<CnAppRoot :app-id="appId" :manifest="manifest" />               <!-- auto-shows -->
<CnAppRoot :app-id="appId" :manifest="manifest" :support-dialog="false" /> <!-- opt out -->
<CnAppRoot :app-id="appId" :manifest="manifest" :support-dialog="{ appName: 'Pipelinq', donateUrl: '…' }" />
```

Server persistence requires the host app to expose the generic preferences endpoint (`GET`/`PUT /apps/{appId}/api/preferences/{key}`, backed by `IConfig` user values). The nextcloud-app-template ships the canonical controller; if it's missing, the dialog falls back to per-browser localStorage.

## First-open adoption (manual)

For apps not using `CnAppRoot`, pair `useSupportDialog` with a manual mount for the same "show once per user, then never again" UX:

```vue
<template>
  <CnSupportDialog
    v-if="visible"
    app-name="Decidesk"
    app-slug="decidesk"
    app-store-url="https://apps.nextcloud.com/apps/decidesk"
    feature-request-url="https://github.com/ConductionNL/decidesk/issues/new"
    @close="hide" />
</template>

<script>
import { CnSupportDialog, useSupportDialog } from '@conduction/nextcloud-vue'

export default {
  components: { CnSupportDialog },
  setup() {
    return useSupportDialog('decidesk')
  },
}
</script>
```

`useSupportDialog` reads `localStorage["cn-support-dialog-shown:decidesk"]`:

- if absent, `visible.value` starts `true`,
- after the user dismisses, `hide()` writes `"1"` and sets `visible.value = false`,
- subsequent app opens stay quiet.

Use `reset()` from the same composable to re-enable the dialog (tests, admin "show again" UI, etc).

## Props

| Prop | Type | Default | Notes |
| ---- | ---- | ------- | ----- |
| `appName` | `String` (required) | — | Interpolated into the body copy and the dialog title. |
| `appSlug` | `String` (required) | — | Kebab-case app id; pairs with the `useSupportDialog` localStorage namespace. |
| `appStoreUrl` | `String` (required) | — | URL the "Review on App Store" CTA opens. |
| `featureRequestUrl` | `String` (required) | — | URL the "Suggest a feature" CTA opens (typically the host's GitHub issues template). |
| `donateUrl` | `String` | `https://github.com/sponsors/ConductionNL` | Override per-app if the host has its own donation channel. |
| `supportUrl` | `String` | `https://www.conduction.nl/support` | "Get support" CTA target — the partner-matching page. |
| `conductionUrl` | `String` | `https://www.conduction.nl` | Target of the inline "Conduction" link in the default body. Ignored when `bodyParagraphs` is set. |
| `appsUrl` | `String` | `https://www.conduction.nl/connext` | Target of the inline "apps" link in the default body. Ignored when `bodyParagraphs` is set. |
| `founderName` | `String` | `Ruben van der Linde` | Rendered in the handwritten signature. |
| `founderTitle` | `String` | `a founder of Conduction` | Title under the signature. |
| `founderAvatarUrl` | `String` | bundled portrait (data URI) | Avatar shown left of the signature. Defaults to the self-hosted founder portrait (no third-party request). Override with any URL or data URI when signing your own apps. |
| `founderProfileUrl` | `String` | `https://www.linkedin.com/in/rubenlinde/` | Profile the avatar links to (new tab). Pass `''` to render the avatar without a link. |
| `bodyParagraphs` | `Array<String>` | `[]` | Override the default Conduction body copy with a host-specific message (release announcement, pricing change, etc). When non-empty, the built-in paragraphs and inline links are skipped. |

## Events

| Event | Payload | Notes |
| ----- | ------- | ----- |
| `close` | — | Emitted when the user dismisses the dialog (backdrop, ESC, close icon). Pair with `useSupportDialog().hide` to also persist the dismissal. |
| `action` | `{ action, url }` | Fired alongside the native `window.open` call on each CTA click. `action` is one of `feature-request`, `app-store`, `donate`, `support`. Useful for analytics. |

## Copy guidance

The default body is intentionally short, personal, and signed. It is **not** a sales funnel:

- Frames feature requests as the most valuable contribution — matching the editorial line on the Features & Roadmap surface.
- Reviews and donations are positioned as small, optional gestures.
- The app stays free; "Get support" routes organisations to a Conduction partner rather than implying Conduction sells support directly (per the partner model on conduction.nl/support).

If you need a different voice (release announcement, sunset notice, pricing change), use the `bodyParagraphs` override rather than forking the component.

## Font note

The handwritten signature uses **Caveat** (SIL OFL 1.1, latin subset). The font is self-hosted: the woff2 file is inlined as base64 inside a scoped `@font-face` rule that is appended to `document.head` on the first dialog mount. Apps that never open the dialog do not pay the font cost at runtime beyond the bundle bytes.

The OFL attribution lives next to the bundled font at `src/components/CnSupportDialog/assets/Caveat-OFL.txt`.

## Avatar note

The founder avatar is **self-hosted**: the bundled portrait (Ruben van der Linde, the canonical avatar the conduction-website repo references) is inlined as a data URI in `src/components/CnSupportDialog/assets/founderAvatar.js`, so there is no third-party image request. The source PNG sits next to it as `founder-avatar-ruben.png`; regenerate the data URI with `base64 -w0 founder-avatar-ruben.png`.

Other parties signing their own apps override it the same way as the copy — pass `founder-name`, `founder-title`, `founder-avatar-url` and `founder-profile-url` props:

```vue
<CnSupportDialog
  v-if="visible"
  app-name="Acme App"
  app-slug="acme-app"
  app-store-url="https://apps.nextcloud.com/apps/acme-app"
  feature-request-url="https://github.com/acme/acme-app/issues/new"
  founder-name="Jane Doe"
  founder-title="Maintainer"
  founder-avatar-url="https://acme.example/jane.png"
  founder-profile-url="https://www.linkedin.com/in/jane-doe/"
  conduction-url="https://acme.example"
  apps-url="https://acme.example/apps"
  @close="hide" />
```

## See also

- [`useSupportDialog`](./use-support-dialog.md) — composable for first-open persistence.
- [`CnFeaturesAndRoadmapSidebar`](./cn-features-and-roadmap-sidebar.md) — its fourth container (Support this project → Show support note) opens this dialog.
