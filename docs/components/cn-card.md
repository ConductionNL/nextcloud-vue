# CnCard

Generic prop-driven card for rendering an entity with a title, icon, description, labels, stats, and optional footer links/tags. Unlike [CnObjectCard](./cn-object-card.md) (schema-driven) and [CnDetailCard](./cn-detail-card.md) (detail-page section container), `CnCard` is a flexible building block for fixed-structure entities where you pass each piece of content explicitly.

The title auto-detects truncation and shows the full text as a tooltip when ellipsized. The card can be marked `active` to show a colored highlight border, or `clickable` to add hover feedback and emit a `click` event.

## Usage

```vue
<!-- Basic card with stats -->
<CnCard
  title="My Source"
  description="A PostgreSQL data source"
  :icon="DatabaseArrowRightOutline"
  :stats="[
    { label: 'Type', value: 'PostgreSQL' },
    { label: 'Rows', value: 128430 },
  ]">
  <template #actions>
    <NcActions>
      <NcActionButton @click="edit">Edit</NcActionButton>
    </NcActions>
  </template>
</CnCard>

<!-- Active state with labels -->
<CnCard
  title="My Organisation"
  :icon="OfficeBuilding"
  :active="isActive"
  active-variant="success"
  :labels="[
    { text: 'Default', variant: 'warning' },
    { text: 'Active', variant: 'success' },
  ]" />

<!-- Clickable with footer links and tags -->
<CnCard
  title="Documentation"
  description="Reference guide"
  :clickable="true"
  :footer-links="[{ url: 'https://example.org/docs', label: 'Read more' }]"
  :tags="['vue', { text: 'stable', variant: 'success' }]"
  @click="openDetail" />
```

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | String | `''` | Card title text. Auto-ellipsizes; full text shown as tooltip when truncated. |
| `description` | String | `''` | Description paragraph, truncated via CSS line-clamp to `descriptionLines`. |
| `titleTooltip` | String | `''` | Explicit tooltip text for the title. Falls back to `description`-less behaviour: when unset, the tooltip shows the title only while ellipsized. |
| `icon` | Object \| Function | `null` | Vue component reference (typically an imported MDI icon) rendered before the title. |
| `iconSize` | Number | `20` | Pixel size passed to the icon component. |
| `labels` | Array | `[]` | Badge/label objects `{ text, variant? }` displayed inline with the title. `variant` maps to [CnStatusBadge](./cn-status-badge.md) variants: `default` \| `primary` \| `success` \| `warning` \| `error` \| `info`. |
| `stats` | Array | `[]` | Stat rows `{ label, value }` rendered as label/value pairs in the body. |
| `descriptionLines` | Number | `3` | Maximum visible lines for the description before truncation. |
| `active` | Boolean | `false` | Highlight the card with a thicker colored border. |
| `activeVariant` | String | `'success'` | Border color when `active`. One of `success` \| `primary` \| `warning` \| `error` \| `info`. |
| `clickable` | Boolean | `false` | Adds hover shadow and cursor pointer; required to emit `click`. |
| `footerLinks` | Array | `[]` | External links `{ url, label? }` rendered as `target="_blank"` anchors in the footer. |
| `tags` | Array | `[]` | Footer tags. Each entry is either a string (defaulted to `default` variant) or `{ text, variant? }`. |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `click` | `MouseEvent` | Emitted when the card is clicked. Only fires while `clickable` is `true`. |

### Slots

| Slot | Description |
|------|-------------|
| default | Content rendered between the description and the stats/footer. |
| `icon` | Override for the header icon (replaces `icon` prop rendering). |
| `actions` | Header action area (top right). Typically an `NcActions` menu. |
| `labels` | Replaces the default labels row (use when labels need custom icons or markup). |
| `description` | Replaces the default description paragraph. |
| `stats` | Replaces the default stats block. |
| `footer` | Replaces the entire footer (links + tags). |
| `footer-link-icon-{i}` | Icon rendered before the `i`-th footer link (zero-indexed). |
