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
