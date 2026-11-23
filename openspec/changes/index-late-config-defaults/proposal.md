# Proposal: index-late-config-defaults

## Why

Board PqLeads opens on "Pijplijn: Verkoop": the list's default pipeline as a removable filter. The default pipeline is
the host app's setting, read after the page opened, and `defaultFilters` were resolved once at setup: an
`@config.defaultPipeline?` token that was still unknown was dropped and never came back.

## What changes

Default filters that name an app-config value apply once that value arrives, as long as the list still shows the
defaults it opened with. A filter the person set, one from the address or a saved view is never replaced.
