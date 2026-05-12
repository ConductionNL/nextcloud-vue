import Playground from '@site/src/components/Playground'
import GeneratedRef from './_generated/CnXwikiCard.md'

# CnXwikiCard

Surface-aware widget for the XWiki ("Articles") integration in the [pluggable integration registry](../../guides/integrations.md). One component renders all four surfaces (AD-19):

- `detail-page` — linked pages list + a **text preview** of the first linked page (HTML stripped to plain text, first ~500 chars — XWiki macros are **not** executed in Nextcloud) + a link to the full page in XWiki.
- `user-dashboard` / `app-dashboard` — the most recent linked pages (compact list, no preview).
- `single-entity` — a chip (title + breadcrumb) for one page resolved from the `value` prop (a canonical `Space.Page` reference). Used when a schema property declares `referenceType: 'xwiki'`.

You don't mount this directly — it's registered as the `widget` for the `xwiki` integration.

## Try it

<Playground component="CnXwikiCard" />

## Usage

```vue
<!-- Rendered by CnDashboardPage / CnDetailPage when a layout item is
     { type: 'integration', integrationId: 'xwiki' }, or by CnFormDialog /
     CnDetailGrid for referenceType: 'xwiki' properties. -->
<CnXwikiCard
  :register="registerId"
  :schema="schemaId"
  :object-id="objectId"
  surface="detail-page" />
```

## Reference

<GeneratedRef />
