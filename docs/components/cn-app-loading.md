# CnAppLoading

Full-page loading screen used by [`CnAppRoot`](./cn-app-root.md) during the loading phase (while [`useAppManifest`](../utilities/composables/use-app-manifest.md) is fetching). Renders an optional logo, the Nextcloud loading spinner, and a message.

Apps can either pass props for branding/messaging, override the `#logo` slot for a custom logo treatment, or replace the whole screen via `CnAppRoot`'s `#loading` slot.

**Wraps**: `NcLoadingIcon`

## Usage

### As CnAppRoot's default loading screen (typical)

```vue
<CnAppRoot :manifest="manifest" app-id="decidesk" :is-loading="isLoading" />
<!-- CnAppRoot mounts CnAppLoading automatically while isLoading is true. -->
```

### Customised via props

```vue
<CnAppRoot ...>
  <template #loading>
    <CnAppLoading
      message="Loading Decidesk…"
      logo-url="/apps/decidesk/img/logo.svg" />
  </template>
</CnAppRoot>
```

### With a custom logo slot

```vue
<CnAppLoading message="Loading…">
  <template #logo>
    <MyAnimatedLogo />
  </template>
</CnAppLoading>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `message` | `String` | `'Loading...'` | Plain string displayed below the spinner. The library never imports `t()` from a specific app, so the consuming app pre-translates. |
| `logoUrl` | `String` | `''` | Optional logo image URL. Rendered as an `<img>` above the spinner; ignored when the `#logo` slot is overridden with content. |

## Slots

| Slot | Description |
|------|-------------|
| `logo` | Replaces the default `<img>` rendering. Useful for SVG components or animated logos. |

## CSS

The component uses Nextcloud CSS variables only (`--color-main-background`, `--color-main-text`, `--color-text-maxcontrast`, `--default-grid-baseline`, `--default-font-size`) so it picks up nldesign theming automatically. Class prefix: `cn-app-loading__*`.

## Related

- [CnAppRoot](./cn-app-root.md) — Mounts CnAppLoading by default during the loading phase.
- [useAppManifest](../utilities/composables/use-app-manifest.md) — Source of the `isLoading` flag.
