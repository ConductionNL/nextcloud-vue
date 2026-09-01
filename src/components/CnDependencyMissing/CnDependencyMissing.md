Shown when required apps declared in `manifest.dependencies` are not installed or enabled. CnAppRoot mounts this automatically; apps can override the `#dependency-missing` slot for custom branding.

Not installed:

```vue
<div style="height: 320px; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;">
  <CnDependencyMissing
    :dependencies="[
      { id: 'openregister', name: 'Open Register' },
      { id: 'opencatalogi', name: 'Open Catalogi' },
    ]"
    heading="Missing dependencies"
    intro="The following apps must be installed before you can use this application." />
</div>
```

App installed but disabled:

```vue
<div style="height: 280px; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;">
  <CnDependencyMissing
    :dependencies="[
      { id: 'openregister', name: 'Open Register', enabled: false },
    ]"
    heading="App disabled"
    intro="Enable the following app to continue." />
</div>
```

With appName and custom link labels:

```vue
<div style="height: 280px; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;">
  <CnDependencyMissing
    app-name="My App"
    :dependencies="[
      { id: 'openregister', name: 'Open Register' },
      { id: 'spreed', name: 'Nextcloud Talk', enabled: false },
    ]"
    install-label="Install now"
    enable-label="Enable now" />
</div>
```

## Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `appName` | String | `''` | Optional name of the host app included in the default heading |
| `installLabel` | String | `'Install and enable'` | Label shown on the action for apps that are not yet installed |
| `enableLabel` | String | `'Enable'` | Label shown on the action for apps that are installed but disabled |
| `askAdminLabel` | String | `'Ask your administrator to enable {name}'` | Non-admin copy shown in place of the action; `{name}` is replaced by the dependency's display name |

For an admin (`getCurrentUser().isAdmin`) each dependency renders an install/enable button driven by [`useAppInstaller`](../../../docs/utilities/composables/use-app-installer.md) — one click installs-and-enables the app via Nextcloud's `settings/apps/enable` endpoint and reloads on success; on failure the error shows inline and the store link stays as a fallback. Non-admins see the `askAdminLabel` copy instead.

## Where this screen is used: three tiers of dependency

A missing app is not one situation, and using the wrong tier is how "not
installed" ends up looking like "no data".

**1. The whole app cannot work — `manifest.dependencies` (required)**

`CnAppRoot` checks these before the shell mounts and renders this screen in
place of the entire app. Use it only when nothing works without the other app;
pipelinq's dependency on OpenRegister is the canonical case.

**2. One page cannot work — `page.requiresApp` (soft)**

`CnPageRenderer` renders this screen instead of that page's body. The menu entry
is normally *also* hidden with `visibleIf: { appInstalled }`, so this is what
catches the ways in that bypass the menu: a bookmark, a shared URL, a redirect,
an e2e spec. Without it those all land on an empty page with nothing explaining
why.

Override `heading` and `intro` here — `CnPageRenderer` does — because this
component's defaults ("Required apps are missing") are written for tier 1, where
nothing works at all. On a page-level gate that phrasing sends the reader hunting
for a broken install.

**3. One widget cannot work — `visibleIf: { appInstalled }`**

The widget hides and the page renders normally. A detail page may carry a dozen
widgets where only one needs the app, and replacing the whole page because of one
of them would be wrong. No screen is shown.

> ⚠️ This is NOT the deprecated soft-dependency notice (REQ-DIA-6, off by default
> since 2.1.0). Those rendered one stacked banner per optional app above **every**
> page on **every** load, for an audience that mostly could not act on them; that
> information now lives in `CnLeafDependencySettings` in admin settings. Tier 2
> renders on the one page that actually needs the app, only when someone
> navigates to it.
