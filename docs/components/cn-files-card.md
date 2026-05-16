import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnFilesCard.md'

# CnFilesCard

Compact files widget for the [pluggable integration registry](../../guides/integrations.md). Fetches files attached to an OpenRegister object and renders the most recent entries inside a `CnDetailCard`. Surface-aware shell around the `files` integration: handles `user-dashboard`, `app-dashboard`, `detail-page`, and `single-entity` from a single component.

**Wraps**: CnDetailCard

## Try it

<Playground component="CnFilesCard" />

## Usage

```vue
<CnFilesCard
  :register="registerId"
  :schema="schemaId"
  :object-id="objectId"
  surface="detail-page"
  @show-all="openFilesTab" />
```

Pass pre-translated labels when your app handles i18n:

```vue
<CnFilesCard
  :register="reg"
  :schema="schema"
  :object-id="id"
  :no-files-label="t('myapp', 'No files attached yet')"
  :show-all-label="t('myapp', 'Show all')" />
```

## Display props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | String | `''` | Override the card title (defaults to the translated label). |
| `maxDisplay` (`max-display`) | Number | `5` | Maximum rows to render. |
| `collapsible` | Boolean | `false` | Whether the card collapses. |
| `apiBase` (`api-base`) | String | `'/apps/openregister/api'` | Base API URL. |

## Reference

<GeneratedRef />
