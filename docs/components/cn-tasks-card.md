import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnTasksCard.md'

# CnTasksCard

Inline tasks widget for detail pages. Fetches tasks from the OpenRegister API and displays them sorted by due date (soonest first). Shows status icons, assignee names (with `CnUserActionMenu`), and due dates. Overdue tasks are highlighted in red.

**Wraps**: CnDetailCard, CnUserActionMenu

## Try it

<Playground component="CnTasksCard" />

## Usage

```vue
<CnTasksCard
  register-id="uuid-register"
  schema-id="uuid-schema"
  object-id="uuid-object"
  @show-all="openSidebarTasksTab" />
```

Pass pre-translated labels when your app handles i18n:

```vue
<CnTasksCard
  register-id="reg"
  schema-id="schema"
  object-id="obj"
  :title-label="t('myapp', 'Tasks')"
  :no-tasks-label="t('myapp', 'No tasks')"
  :show-all-label="t('myapp', 'Show all')"
  :unassigned-label="t('myapp', 'Unassigned')" />
```

### Status icons

| Status value | Icon | Color |
|---|---|---|
| `'completed'` | Checkbox checked | Green (success) |
| `'active'` / `'in-process'` | Progress clock | Blue (primary) |
| `'terminated'` | Close circle | Red (error) |
| Any other | Empty checkbox | Grey |

### Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `registerId` | String | ✓ | — | OpenRegister register UUID |
| `schemaId` | String | ✓ | — | OpenRegister schema UUID |
| `objectId` | String | ✓ | — | Object UUID |
| `apiBase` | String | | `'/apps/openregister/api'` | Base URL for OpenRegister API calls |
| `maxDisplay` | Number | | `5` | Maximum number of tasks to show before the "Show all" footer appears |
| `collapsible` | Boolean | | `false` | Whether the card supports collapse/expand |
| `titleLabel` | String | | `'Tasks'` | Card title |
| `noTasksLabel` | String | | `'No tasks'` | Empty state text |
| `showAllLabel` | String | | `'Show all'` | Footer link label |
| `unassignedLabel` | String | | `'Unassigned'` | Text shown when a task has no assignee |

### Events

| Event | Payload | Description |
|-------|---------|-------------|
| `show-all` | — | Emitted when the "Show all" footer link is clicked |

## Reference (auto-generated)

The tables below are generated from the SFC source via `vue-docgen-cli`. They reflect what's actually in [`CnTasksCard.vue`](https://github.com/ConductionNL/nextcloud-vue/blob/beta/src/components/CnTasksCard/CnTasksCard.vue) and update automatically whenever the component changes.

<GeneratedRef />
