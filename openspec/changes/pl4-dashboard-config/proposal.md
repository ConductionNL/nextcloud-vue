# pl4-dashboard-config

## Why

pipelinq's knowledge-base dashboard widget is a custom wrapper only because it scopes the search to the admin's
default xWiki space, a setting. The library's `kb-search` widget takes a `space`, but a dashboard filled
`@config.<key>` only in endpoint sources and filters, not in a widget's content, and a dashboard read its app config
only from its own `appConfig` prop, which no app passes.

## What changes

- CnDashboardPage merges its `appConfig` over the `cnAppConfig` an ancestor provides.
- A registry widget's `content` takes `@config.<key>` at any depth; an unset optional token becomes empty. The filled
  content is kept per content object, so the widget is not handed a new object each render.

## Fleet reuse

- pipelinq `XWikiDashboardWidget` becomes `kb-search` config; any widget content that names a setting.
