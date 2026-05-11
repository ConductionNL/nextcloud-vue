import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnTagsCard.md'

# CnTagsCard

Compact tags widget for the [pluggable integration registry](../../guides/integrations.md). Fetches the Nextcloud system tags attached to an OpenRegister object and renders them as inline pills inside a `CnDetailCard`. Surface-aware shell around the `tags` integration: handles `user-dashboard`, `app-dashboard`, `detail-page`, and `single-entity` from a single component.

**Wraps**: CnDetailCard

## Try it

<Playground component="CnTagsCard" />

## Usage

```vue
<CnTagsCard
  :register="registerId"
  :schema="schemaId"
  :object-id="objectId"
  surface="detail-page" />
```

Pass pre-translated labels when your app handles i18n:

```vue
<CnTagsCard
  :register="reg"
  :schema="schema"
  :object-id="id"
  :no-tags-label="t('myapp', 'No tags')" />
```

## Reference

<GeneratedRef />
