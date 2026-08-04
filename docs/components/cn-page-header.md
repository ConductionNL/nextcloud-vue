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

<!-- Heading for assistive technology only -->
<CnPageHeader title="Products" :visually-hidden="true" />
```

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `title` | String | ✓ | — | Page title text |
| `description` | String | | `''` | Optional description shown below the title |
| `icon` | String | | `''` | MDI icon name rendered via CnIcon |
| `iconSize` | Number | | `28` | Icon size in pixels |
| `visuallyHidden` | Boolean | | `false` | Render the `<h1>` for assistive technology only — clipped to a 1px box and removed from layout flow. See below. |

### Accessible-heading mode (`visuallyHidden`)

Set `visuallyHidden` when the design surfaces the page title somewhere else —
typically the app sidebar — and a second, visible header inside the content
area is not wanted. The `<h1>` stays in the DOM and in the accessibility tree,
so the page looks exactly as it would with no header at all while the
surrounding `<main>` landmark still carries a heading.

This exists because the sidebar heading lives **outside** the `<main>`
landmark. Suppressing the header entirely left the main content region with no
heading at all: a screen-reader user got no announcement of which page they
were on, and a "skip to main content" jump landed on an unlabelled region —
WCAG 2.4.6 (Headings and Labels) and 1.3.1 (Info and Relationships).

The decorative icon, the `description` and the `extra` slot are **not** rendered
in this mode. The icon is decorative, and `extra` may contain focusable
controls, which must never be clipped-but-tabbable.

`CnIndexPage`, `CnSettingsPage`, `CnChatPage`, `CnFilesPage` and `CnLogsPage`
wire this from their own `showTitle` prop (`:visually-hidden="!showTitle"`), so
those pages always emit a heading — `showTitle` now controls **visibility only**
and can no longer remove the heading from the accessibility tree.

### Slots

| Slot | Description |
|------|-------------|
| `icon` | Custom icon element replacing the `icon` prop (not rendered when `visuallyHidden`) |
| `extra` | Additional content rendered after the title block (e.g., badges, counters) (not rendered when `visuallyHidden`) |

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnPageHeader.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnPageHeader/CnPageHeader.vue) and update automatically whenever the component changes.

<GeneratedRef />
