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
| `collapsible` | Boolean | `false` | Whether the card collapses. |
| `actionLabel` (`action-label`) | String | `t('nextcloud-vue', 'Change')` | Pre-translated fallback action label. |
| `apiBase` (`api-base`) | String | `'/apps/openregister/api'` | Base API URL. |

## Reference

<GeneratedRef />

## The app-wide feed (`scope: "app"`)

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `scope` | `String` | `'object'` | `object` lists one object's trail and needs `register`, `schema` and `objectId`. `app` lists the reader's whole feed: the entries of every object the caller may read (OpenRegister's `/audit-trails/readable`), narrowed to `register` and `schema` when set, with no object. |

The built-in `audit-trail` widget (`CnAuditTrailWidget`) takes the same `scope` as a prop or as `content.scope`, so a dashboard can declare `{ "widgetKey": "audit-trail", "props": { "content": { "scope": "app", "title": "Recent activity", "register": "dossiq" } } }`.
