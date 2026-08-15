Basic — icon, title, and description. Use `iconSize` (default `28`) to adjust the icon pixel size:

```vue
<CnPageHeader
  title="Clients"
  description="Manage your clients and contact information"
  icon="HelpCircleOutline"
  :icon-size="32" />
```

Title only (no icon, no description):

```vue
<CnPageHeader title="Dashboard" />
```

Custom icon via slot:

```vue
<template>
  <CnPageHeader title="Schemas" description="Configure your data schemas">
    <template #icon>
      <DatabaseOutline :size="28" style="color: var(--color-primary-element);" />
    </template>
  </CnPageHeader>
</template>
<script>
import DatabaseOutline from 'vue-material-design-icons/DatabaseOutline.vue'
export default {
  components: { DatabaseOutline },
}
</script>
```

Accessible-heading mode — `visuallyHidden`:

```vue
<CnPageHeader title="Products" :visually-hidden="true" />
```

Set `visuallyHidden` (default `false`) when the design surfaces the page title
somewhere else — typically the app sidebar — and you do not want a second,
visible header inside the content area. The `<h1>` stays in the DOM and in the
accessibility tree, clipped to a 1px box and taken out of layout flow, so the
page looks exactly as it would with no header at all.

This exists because the sidebar heading lives **outside** the `<main>`
landmark. Suppressing the header entirely left the main content region with no
heading: screen-reader users got no announcement of which page they were on,
and a "skip to main content" jump landed on an unlabelled region — WCAG 2.4.6
(Headings and Labels) and 1.3.1 (Info and Relationships).

The decorative icon, the `description` and the `#extra` slot are **not**
rendered in this mode. The icon is decorative, and `#extra` may contain
focusable controls, which must never be clipped-but-tabbable.

`CnIndexPage`, `CnSettingsPage`, `CnChatPage`, `CnFilesPage` and `CnLogsPage`
wire this automatically from their own `showTitle` prop
(`:visually-hidden="!showTitle"`), so those components always emit a heading
regardless of `showTitle`.

With extra content (e.g., a badge or status indicator):

```vue
<CnPageHeader title="API Gateway" description="Proxy and routing configuration">
  <template #extra>
    <CnStatusBadge label="Online" variant="success" />
  </template>
</CnPageHeader>
```
