Default loading screen — shown while `useAppManifest` fetches the manifest:

```vue
<div style="height: 300px; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;">
  <CnAppLoading message="Loading application..." />
</div>
```

Custom message:

```vue
<div style="height: 300px; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;">
  <CnAppLoading message="Connecting to Open Register..." />
</div>
```

With logoUrl — shows a branded image above the spinner:

```vue
<div style="height: 300px; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;">
  <CnAppLoading
    logo-url="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%230082c9'/%3E%3C/svg%3E"
    message="Loading My App..." />
</div>
```

With logo slot override — render any element above the spinner:

```vue
<div style="height: 300px; background: var(--color-main-background); border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;">
  <CnAppLoading message="Starting...">
    <template #logo>
      <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='10' fill='%230082c9'/%3E%3C/svg%3E" alt="My App" style="max-width: 96px;" />
    </template>
  </CnAppLoading>
</div>
```

## Additional props and slots

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `logoUrl` | String | `''` | Optional image URL displayed above the spinner. Apps with custom branding can also override the `#logo` slot instead. |

| Slot | Description |
|------|-------------|
| `logo` | Replaces the default logo image above the spinner. Use this for custom branding when `logoUrl` alone is not sufficient. |
