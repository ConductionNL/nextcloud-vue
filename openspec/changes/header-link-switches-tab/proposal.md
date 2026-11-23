# Proposal: header-link-switches-tab

## Why

A card header link can open another page or a URL, not another tab of the page it sits on. DqZaaktype's side Historie
card ends in a link to the Historie tab of the same case-type page.

## What changes

A widget's `headerLink` takes `tab` (a tab id). It draws as a `#<tab>` anchor. CnTabsWidget opened the tab a hash names
only when it was created; it now also follows a hash that changes while the page is open (`hashchange`), so the link
opens the tab without a reload. A tab still pending opens once it appears; an unknown id changes nothing.

## Scope

nextcloud-vue. Manifest schema 2.140.0: `widgetEntry.headerLink.tab` (the integrator renumbers the bump).
