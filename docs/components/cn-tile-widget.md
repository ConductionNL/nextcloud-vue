import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnTileWidget.md'

# CnTileWidget

Quick-access link tile with a colored background, icon, and title. Used in `CnDashboardPage` for widgets with `type: 'tile'`. Supports SVG path icons, CSS class icons, image URL icons, and emoji icons. Links navigate to Nextcloud app routes or external URLs.

## Try it

<Playground component="CnTileWidget" />

## Usage

```vue
<!-- In CnDashboardPage widget definition -->
const WIDGETS = [
  {
    id: 'files-tile',
    type: 'tile',
    title: 'Files',
    icon: 'M12,2C6.48,2,...',   // SVG path
    iconType: 'svg',
    backgroundColor: '#0082c9',
    textColor: '#ffffff',
    linkType: 'app',             // generates /apps/files
    linkValue: 'files',
  },
  {
    id: 'external-tile',
    type: 'tile',
    title: 'Documentation',
    icon: '📖',
    iconType: 'emoji',
    backgroundColor: '#46ba61',
    textColor: '#ffffff',
    linkType: 'url',
    linkValue: 'https://docs.example.com',
  },
]

<!-- Used standalone -->
<CnTileWidget :tile="tileConfig" />
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `tile` | Object | ✓ | Tile configuration (see Tile object below) |

#### Tile object

| Field | Type | Description |
|-------|------|-------------|
| `title` | String | Display label below the icon |
| `icon` | String | Icon value — SVG path string, CSS class name, image URL, or emoji character |
| `iconType` | String | `'svg'`, `'class'`, `'url'`, or `'emoji'` |
| `backgroundColor` | String | Tile background color (CSS color value) |
| `textColor` | String | Icon and title color (CSS color value) |
| `linkType` | String | `'app'` (generates `/apps/{value}`) or `'url'` (used as-is) |
| `linkValue` | String | App name or full URL |

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnTileWidget.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnTileWidget/CnTileWidget.vue) and update automatically whenever the component changes.

<GeneratedRef />
