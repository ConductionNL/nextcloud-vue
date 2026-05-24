import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnEmailCard.md'

# CnEmailCard

Compact email widget for the [pluggable integration registry](../../guides/integrations.md). Fetches the most recent Nextcloud Mail messages linked to an OpenRegister object (link-table storage strategy, backed by `EmailService` + `EmailProvider`) and renders them inside a `CnDetailCard`. Surface-aware shell around the `email` integration: handles `user-dashboard`, `app-dashboard`, `detail-page`, and `single-entity` from a single component (single-entity collapses to a single row).

**Wraps**: CnDetailCard

## Try it

<Playground component="CnEmailCard" />

## Usage

```vue
<CnEmailCard
  :register="registerId"
  :schema="schemaId"
  :object-id="objectId"
  surface="detail-page"
  @show-all="openEmailsTab" />
```

Pass pre-translated labels when your app handles i18n:

```vue
<CnEmailCard
  :register="reg"
  :schema="schema"
  :object-id="id"
  :no-messages-label="t('myapp', 'No linked emails yet')"
  :error-label="t('myapp', 'Could not load emails')"
  :open-in-mail-label="t('myapp', 'Open in Mail')"
  :no-subject-label="t('myapp', '(no subject)')"
  :unknown-sender-label="t('myapp', 'Unknown sender')"
  :show-all-label="t('myapp', 'Show all')" />
```

Clicking a row opens the message in the NC Mail app in a new tab. The card itself never composes or sends — per AD-2 of `nextcloud-entity-relations`, Mail owns SMTP and OR owns the link.

## Display props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `title` | String | `''` | Override the card title (defaults to the translated label "Emails"). |
| `maxDisplay` (`max-display`) | Number | `5` | Maximum rows to render. Forced to 1 on the `single-entity` surface. |
| `collapsible` | Boolean | `false` | Whether the card collapses. |
| `apiBase` (`api-base`) | String | `'/apps/openregister/api'` | Base API URL for the OR registry endpoint. |

## Reference

<GeneratedRef />
