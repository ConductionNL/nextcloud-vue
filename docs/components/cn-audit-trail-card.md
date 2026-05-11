import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnAuditTrailCard.md'

# CnAuditTrailCard

Compact audit-trail widget for the [pluggable integration registry](../../guides/integrations.md). Fetches the most recent audit-trail entries for an OpenRegister object (query-time storage strategy) and renders them inside a `CnDetailCard`. Surface-aware shell around the `audit-trail` integration: handles `user-dashboard`, `app-dashboard`, `detail-page`, and `single-entity` from a single component.

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

## Reference

<GeneratedRef />
