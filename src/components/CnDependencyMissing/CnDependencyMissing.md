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
