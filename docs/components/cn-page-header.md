# CnPageHeader

Page header with an optional MDI icon, title, and description. Used at the top of index and detail pages to provide consistent visual identity.

**Wraps**: CnIcon

## Usage

```vue
<!-- Basic with icon -->
<CnPageHeader
  title="Clients"
  description="Manage your client relationships"
  icon="AccountGroup" />

<!-- Title only -->
<CnPageHeader title="Settings" />

<!-- Custom icon via slot -->
<CnPageHeader title="Dashboard">
  <template #icon>
    <img src="/apps/myapp/img/logo.svg" alt="" class="page-icon" />
  </template>
</CnPageHeader>

<!-- Extra content alongside title -->
<CnPageHeader title="Cases" description="Open cases" icon="BriefcaseOutline">
  <CnStatusBadge :label="String(openCount)" variant="warning" />
</CnPageHeader>
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | String | ✓ | — | Page title text |
| `description` | String | | `''` | Optional description shown below the title |
| `icon` | String | | `''` | MDI icon name rendered via CnIcon |
| `iconSize` | Number | | `28` | Icon size in pixels |

### Slots

| Slot | Description |
|------|-------------|
| `icon` | Custom icon element replacing the `icon` prop |
| `extra` | Additional content rendered after the title block (e.g., badges, counters) |
