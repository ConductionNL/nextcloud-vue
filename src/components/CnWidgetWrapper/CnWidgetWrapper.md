Basic — widget card with title and content:

```vue
<div style="width: 320px; height: 200px; position: relative; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;">
  <CnWidgetWrapper title="Recent activity" :show-title="true">
    <ul style="margin: 0; padding: 0 16px; list-style: none;">
      <li style="padding: 6px 0; border-bottom: 1px solid var(--color-border);">Object #001 created</li>
      <li style="padding: 6px 0; border-bottom: 1px solid var(--color-border);">Schema updated</li>
      <li style="padding: 6px 0;">User joined</li>
    </ul>
  </CnWidgetWrapper>
</div>
```

With footer buttons:

```vue
<div style="width: 320px; height: 220px; position: relative; border: 1px solid var(--color-border); border-radius: 8px; overflow: hidden;">
  <CnWidgetWrapper
    title="Open tasks"
    :show-title="true"
    :buttons="[
      { label: 'View all', link: '#' },
    ]">
    <div style="padding: 8px 0; color: var(--color-text-maxcontrast); font-size: 14px; text-align: center; margin-top: 24px;">
      3 tasks due today
    </div>
  </CnWidgetWrapper>
</div>
```

Borderless — for widgets embedded in a grid that supplies its own border:

```vue
<div style="width: 320px; height: 180px; background: var(--color-background-hover); border-radius: 8px; overflow: hidden;">
  <CnWidgetWrapper title="KPIs" :show-title="true" :borderless="true">
    <div style="padding: 16px; display: flex; gap: 24px; justify-content: center;">
      <div style="text-align: center;">
        <div style="font-size: 2rem; font-weight: bold; color: var(--color-primary-element);">42</div>
        <div style="font-size: 12px; color: var(--color-text-maxcontrast);">open</div>
      </div>
      <div style="text-align: center;">
        <div style="font-size: 2rem; font-weight: bold; color: var(--color-success);">284</div>
        <div style="font-size: 12px; color: var(--color-text-maxcontrast);">closed</div>
      </div>
    </div>
  </CnWidgetWrapper>
</div>
```

With `flush`, `iconUrl`, `iconClass`, `titleIconPosition`, `titleIconColor`, `styleConfig`, `title-icon`, and `actions` slots:

```vue
<div style="width: 360px; height: 240px; overflow: hidden;">
  <CnWidgetWrapper
    title="My cases"
    icon-url="https://nextcloud.example.com/apps/files/img/folder.svg"
    icon-class=""
    :flush="true"
    title-icon-position="left"
    title-icon-color="var(--color-primary-element)"
    :style-config="{
      backgroundColor: 'var(--color-background-hover)',
      borderStyle: 'solid',
      borderWidth: 1,
      borderColor: 'var(--color-border)',
      borderRadius: 8,
    }">
    <template #title-icon>
      <!-- Custom icon rendered left of the title -->
      <span style="font-size: 18px;">🗂</span>
    </template>
    <template #actions>
      <NcButton type="tertiary" aria-label="Refresh" @click="refresh">
        <template #icon><span>↻</span></template>
      </NcButton>
    </template>
    <ul style="margin: 0; padding: 0; list-style: none;">
      <li style="padding: 10px 16px; border-bottom: 1px solid var(--color-border);">Case A — open</li>
      <li style="padding: 10px 16px; border-bottom: 1px solid var(--color-border);">Case B — pending</li>
      <li style="padding: 10px 16px;">Case C — closed</li>
    </ul>
  </CnWidgetWrapper>
</div>
```

## Additional props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `flush` | Boolean | `false` | Remove content padding so content goes edge-to-edge |
| `iconUrl` | String | `null` | URL of an image icon shown left of the title |
| `iconClass` | String | `null` | CSS class for a Nextcloud icon shown left of the title |
| `titleIconPosition` | String | `'right'` | Where to render the `title-icon` slot: `'left'` (before title) or `'right'` (after actions) |
| `titleIconColor` | String | `null` | CSS color applied to the `title-icon` slot container |
| `styleConfig` | Object | `{}` | Visual overrides: `{ backgroundColor, borderStyle, borderWidth, borderColor, borderRadius, padding: { top, right, bottom, left } }` |

## Slots

| Slot | Description |
|------|-------------|
| *(default)* | Widget body content |
| `title-icon` | Icon or badge rendered inside the header at the position given by `titleIconPosition` |
| `actions` | Action buttons rendered in the header (right side, before the right title-icon) |
| `footer` | Custom footer content (replaces the auto-generated `buttons` links) |
