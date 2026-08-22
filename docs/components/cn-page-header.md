import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnPageHeader.md'

# CnPageHeader

Page header with an optional MDI icon, title, and description. Used at the top of index and detail pages to provide consistent visual identity.

**Wraps**: CnIcon

## Try it

<Playground component="CnPageHeader" />

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
| `translate` | Function | | `null` | Translate function applied to `title` and `description` (manifest-authored English source strings). Falls back to the injected `cnTranslate` (identity by default), so a missing catalogue renders the source string unchanged. |
| `visuallyHidden` | Boolean | | `false` | Render the title for assistive technology only. Several page primitives (CnIndexPage, CnSettingsPage, CnChatPage, CnFilesPage, CnLogsPage) hide their inline header because the design surfaces the page title in the sidebar — but that heading sits OUTSIDE the `<main>` landmark, leaving the main region with no heading at all. This keeps an accessible heading inside `<main>` without showing it (WCAG 2.4.6 / 1.3.1). Icon, description and the `extra` slot are suppressed with it; only the heading text remains. |

### Slots

| Slot | Description |
|------|-------------|
| `icon` | Custom icon element replacing the `icon` prop |
| `extra` | Additional content rendered after the title block (e.g., badges, counters) |

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnPageHeader.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnPageHeader/CnPageHeader.vue) and update automatically whenever the component changes.

<GeneratedRef />
