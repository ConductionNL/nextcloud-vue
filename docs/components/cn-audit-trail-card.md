import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnAuditTrailCard.md'

# CnAuditTrailCard

Compact audit-trail widget for the [pluggable integration registry](../integrations/registry.md). Fetches the most recent audit-trail entries for an OpenRegister object (query-time storage strategy) and renders them inside a `CnDetailCard`. Surface-aware shell around the `audit-trail` integration: handles `user-dashboard`, `app-dashboard`, `detail-page`, and `single-entity` from a single component.

**Wraps**: CnDetailCard

## Try it

<Playground component="CnAuditTrailCard" />

## Usage

```vue
<CnAuditTrailCard
  :register="registerId"
  :schema="schemaId"
  :object-id="objectId"
  surface="detail-page"
  @show-all="openAuditTrailTab" />
```

Pass pre-translated labels when your app handles i18n:

```vue
<CnAuditTrailCard
  :register="reg"
  :schema="schema"
  :object-id="id"
  :no-entries-label="t('myapp', 'No audit entries yet')"
  :show-all-label="t('myapp', 'Show all')" />
```

## Display props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | String | `''` | Override the card title (defaults to the translated label). |
| `maxDisplay` (`max-display`) | Number | `5` | Maximum rows to render. |
| `excludeActions` (`exclude-actions`) | Array | `[]` | Actions left out, case-insensitive (`['read']` for a history of what changed). The card then reads up to ten times `maxDisplay` entries (at most 100), so the rows it leaves out do not crowd the rest away. |
| `collapsible` | Boolean | `false` | Whether the card collapses. |
| `actionLabel` (`action-label`) | String | `t('nextcloud-vue', 'Change')` | Pre-translated fallback action label. |
| `apiBase` (`api-base`) | String | `'/apps/openregister/api'` | Base API URL. |
| `refusedLabel` (`refused-label`) | String | `t('nextcloud-vue', '(refused)')` | Shown on an entry the server refused (`authorized: false`). |
| `failedLabel` (`failed-label`) | String | `t('nextcloud-vue', 'The history could not be loaded')` | Shown when a `source` or `endpoint` read failed. |

## A flow task, or another source

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `source` | Object | `null` | `{ kind: 'flow-task', id }` reads `{apiBase}/flow-tasks/{id}/audit`, the task engine's own trail. `id` may be left out or written `@objectId`. |
| `actionLabels` | Object | `null` | What happened, in words: by action (`claim`) or by action and the state it led to (`complete:completed`, tried first). `{actor}` and `{state}` are filled in, and a label that names the actor leaves it off the line under it. An action without a label shows as written, with its state in brackets. DqTaak: `{ "claim": "Task picked up by {actor}" }`. |
| `endpoint` | String | `''` | A trail URL of its own; `{id}` is filled with the source's id or `objectId`. |
| `order` | String | `''` | `newest` or `oldest` first. Empty reads a source oldest first and an object newest first. |

A row shows the action with the state it led to (`stateAfter`), the actor, the kind of performer when it is not a person (`performerType`), on whose behalf (`onBehalfOf`), "(refused)" for `authorized: false`, and the entry's `reason`. A failed read says so instead of showing an empty trail.

## Reference

<GeneratedRef />

## The app-wide feed (`scope: "app"`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `scope` | `String` | `'object'` | `object` lists one object's trail and needs `register`, `schema` and `objectId`. `app` lists the reader's whole feed: the entries of every object the caller may read (OpenRegister's `/audit-trails/readable`), narrowed to `register` and `schema` when set, with no object. |

The built-in `audit-trail` widget (`CnAuditTrailWidget`) takes the same `scope` as a prop or as `content.scope`, so a dashboard can declare `{ "widgetKey": "audit-trail", "props": { "content": { "scope": "app", "title": "Recent activity", "register": "dossiq" } } }`.
