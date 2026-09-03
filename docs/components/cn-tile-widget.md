import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnTileWidget.md'

# CnTileWidget

Quick-access link tile with a colored background, icon, and title. Used in `CnDashboardPage` for widgets with `type: 'tile'`. Supports SVG path icons, CSS class icons, image URL icons, and emoji icons. Links navigate to Nextcloud app routes, external URLs, or — for SPA hosts — in-app router routes.

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
  {
    id: 'new-secret-tile',
    type: 'tile',
    title: 'New secret',
    icon: 'M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z',
    iconType: 'svg',
    backgroundColor: '#21468B',
    textColor: '#ffffff',
    linkType: 'route',           // pushed through the host app's vue-router
    linkValue: '/secrets?action=create',
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
| `linkType` | String | `'app'` (generates `/apps/{value}`, full page load), `'url'` (used as-is, new tab), or `'route'` (pushed through the host app's vue-router — SPA navigation, no page reload) |
| `linkValue` | String | App name, full URL, or router path (e.g. `/secrets?action=create`) |

`'route'` requires the host app to use vue-router: plain left clicks call `router.push(linkValue)` so in-memory SPA state survives, while modified clicks (Ctrl/Cmd/Shift/middle-click) fall through to the `router.resolve()`d href and open a real URL in a new tab. On a page without a router the tile degrades to a plain link.

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnTileWidget.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnTileWidget/CnTileWidget.vue) and update automatically whenever the component changes.

<GeneratedRef />
