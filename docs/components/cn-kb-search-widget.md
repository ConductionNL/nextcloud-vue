# CnKbSearchWidget

A summary-driven **knowledge-base search** dashboard widget. Runs the
search through a **pluggable provider** (#91 Wave 3) and renders the
returned articles as a clickable list. Registered as the `kb-search`
dashboard widget type.

Two things drive the query:

1. The agent typing in the box (debounced 300 ms), and
2. — the reason it's a widget, not a plain box — a page **workspace
   context** key (`content.bindTo`, default `activeSummary`) another widget
   writes. When an interaction form sets `activeSummary`, this widget
   auto-searches that text, so the knowledge base follows the live
   conversation. Manual typing wins until the box is cleared.

## Pluggable providers

The search is delegated to a provider resolved from `content.provider`
against the library built-ins **merged with the consumer registry**
`CnAppRoot` provides (`kbSearchProviders` prop → `cnKbSearchProviders`
inject) — the same last-wins registry pattern as column formatters.

- The library ships ONE built-in, **`default`** — the endpoint search: GET
  `content.endpoint` (default the OpenRegister xWiki leaf
  `/apps/openregister/api/integrations/xwiki/search`) with the query param
  plus optional `space` / `tags` / `limit`.
- An app talking to a bespoke KB (the **xwiki proxy**, an external KB API)
  registers its own provider key on `CnAppRoot`. **The xwiki client stays
  app-side** — the library ships the seam, not the client.

A provider is `{ async search(query, opts) => article[], externalOpen? }`;
an article is `{ id?, title, url?, summary?|excerpt?|body? }`. Providers
**reject** on failure so the widget shows its unavailable fallback (never a
partial list).

```js
// app-side registration
createApp(App).use(...).provide(...) // or:
<CnAppRoot :kb-search-providers="{ xwiki: myXwikiProvider }">
```

## Config

```jsonc
{
  "widgetKey": "kb-search",
  "content": {
    "provider": "xwiki",            // registry key (default "default")
    "space": "Support",             // provider-specific filters
    "tags": ["printer", "network"],
    "endpoint": "/apps/openregister/api/integrations/xwiki/search", // default provider
    "queryParam": "q",
    "bindTo": "activeSummary",      // workspace key to auto-search
    "minChars": 3,
    "limit": 8,
    "externalOpen": true,           // result links open in a new tab
    "unavailableFallback": "Knowledge base is not configured."
  }
}
```

`externalOpen` defaults to the provider's own `externalOpen` flag and is
overridable per widget. `unavailableFallback` replaces the default
"Knowledge base unavailable" message.

## Reference (auto-generated)

import GeneratedRef from './_generated/CnKbSearchWidget.md'

<GeneratedRef />
