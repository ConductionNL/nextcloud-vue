import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnEmailTab.md'

# CnEmailTab

Sidebar tab for the `email` integration leaf. Renders the full list of Nextcloud Mail messages linked to an OpenRegister object, paged via a load-more button (default page size 25). Backed by `EmailService` + `EmailProvider` via the registry endpoint `/integrations/email`.

Per design AD-1 the tab is **read-only** — clicking a row deep-links into the NC Mail app. Composing happens in Mail; linking happens via a future picker tracked separately.

## Try it

<Playground component="CnEmailTab" />

## Usage

```vue
<CnEmailTab
  :object-id="objectId"
  :register="registerId"
  :schema="schemaId" />
```

With a custom page size and translated labels:

```vue
<CnEmailTab
  :object-id="objectId"
  :register="registerId"
  :schema="schemaId"
  :page-size="50"
  :no-messages-label="t('myapp', 'No linked emails yet')"
  :error-label="t('myapp', 'Could not load emails')"
  :load-more-label="t('myapp', 'Load more')"
  :no-subject-label="t('myapp', '(no subject)')"
  :unknown-sender-label="t('myapp', 'Unknown sender')" />
```

## Display props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `pageSize` (`page-size`) | Number | `25` | Page size for paged fetches. The load-more button stays visible until `messages.length === total`. |
| `apiBase` (`api-base`) | String | `'/apps/openregister/api'` | Base API URL for the OR registry endpoint. |

## Reference

<GeneratedRef />
