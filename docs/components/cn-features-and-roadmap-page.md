# CnFeaturesAndRoadmapPage

Manifest-driven page primitive for `type: "roadmap"` in v2 app manifests.
Wraps `CnFeaturesAndRoadmapView` so consuming apps can declare a Features
& Roadmap surface in their manifest without a per-app wrapper file.

## When to use

Declare it in `manifest.json`:

```json
{
  "id": "FeaturesRoadmap",
  "route": "/features-roadmap",
  "type": "roadmap",
  "title": "Features & roadmap"
}
```

`CnPageRenderer` mounts this page when the manifest declares the type.
No registry entry or custom component file is needed.

## Resolution order

For each of the three values handed to `CnFeaturesAndRoadmapView`
(`repo`, `features`, `disabled`):

1. Explicit `pages[].config.<key>` from the manifest entry.
2. `loadState(appId, 'features_roadmap_<key>', <fallback>)` —
   backed by Nextcloud `IInitialState` populated server-side.
3. Hardcoded fallback (`repo` defaults to `Conduction/<appId>` on Codeberg,
   `forge` to the `cnFeatureRequestForge` inject (else Codeberg),
   `features` to `[]`, `disabled` to `false`).

`appId` comes from the `cnAiContext` inject populated by `CnAppRoot`.
Override the prop in tests to bypass the inject.

## Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `repo` | String | No | `<owner>/<repo>` slug. Manifest-config override. |
| `features` | Array \| null | No | Build-time feature manifest override. |
| `disabled` | Boolean \| null | No | Admin opt-out override. |
| `appId` | String | No | Override for the appId used to namespace `loadState` lookups. Tests set this; production reads it from the `cnAiContext` inject. |

## Backend contract

Identical to `CnFeaturesAndRoadmapView` — the Roadmap tab consumes
`GET /index.php/apps/openregister/api/github/issues?labels=enhancement,feature`
and the Suggest modal POSTs to the same endpoint. See
[`CnFeaturesAndRoadmapView`](cn-features-and-roadmap-view.md) for
details.

## Migration from per-app wrapper

Before:

```vue
<!-- src/views/FeaturesRoadmap.vue -->
<template>
  <CnFeaturesAndRoadmapView :repo="repo" :features="features" :disabled="disabled" />
</template>

<script>
import { loadState } from '@nextcloud/initial-state'
import { CnFeaturesAndRoadmapView } from '@conduction/nextcloud-vue'

export default {
  data() {
    return {
      repo: loadState('myapp', 'features_roadmap_repo', 'Conduction/myapp'),
      features: loadState('myapp', 'features_roadmap_features', []),
      disabled: loadState('myapp', 'features_roadmap_disabled', false),
    }
  },
}
</script>
```

```json
{ "id": "FeaturesRoadmap", "route": "/features-roadmap", "type": "custom", "component": "FeaturesRoadmap" }
```

After:

```json
{ "id": "FeaturesRoadmap", "route": "/features-roadmap", "type": "roadmap" }
```

Delete the wrapper file, remove the registry/customComponents entry, and
the page just works.

## Spec

[ConductionNL/nextcloud-vue#264](https://github.com/ConductionNL/nextcloud-vue/issues/264)

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `openbuiltUrl` | String | `'/apps/openbuilt'` | URL for the sidebar's "Tweak it in OpenBuilt" CTA. |
| `llmSkillsUrl` | String | — | URL for the sidebar's "Let AI build it" CTA (opens in a new tab). |
| `suggestUrl` | String | `''` | Optional override target for the "Suggest a feature" CTA; when empty the CTA opens the in-product modal. |
| `documentationUrl` | String | `''` | Per-app documentation site URL surfaced in the docs info card. |
| `capabilityComparison` | Object | `null` | Optional capability comparison document, forwarded to the view. Manifest config wins, then the `features_roadmap_capabilities` initial state, then null. |
| `categories` | Object \| null | `null` | Feature category key to caption, the order of the groups in the board look. |
| `board` | Object \| null | `null` | Board look options, see below. Ignored in the default look. |
| `title` | String | `''` | The page title, lifted from the manifest page's `title`. Shown in the board look. |
| `appVersion` | String | `''` | The app version for `{appVersion}` in the board subtitle. Manifest config wins, then the `features_roadmap_app_version` initial state. |

## The board look

In the board look the page draws `CnFeaturesBoard` instead of the plain card grid and its right-hand sidebar: a
title and subtitle, optional folder tabs (Features, Roadmap), a status filter, the features grouped by category, an
optional "Coming next" card with the most requested forge issues and an optional notice. The suggest, buildiq, AI
skills and support links sit in an Actions menu.

A feature takes `{ slug, title, summary, status, category, expected, docsUrl }`, plus `title_<lang>` and
`summary_<lang>` for other languages (`title_nl` for a Dutch reader). `status` is `available` (also `stable`, `done`),
`beta`, `in_progress` or `planned` (also `soon`); a feature without one is available. `expected` ("Q4 2026") follows the status in
the badge. "Learn more" goes to `docsUrl` when it is a web address, else to `documentationUrl`.

| `config.board` key | Default | Description |
|---|---|---|
| `layout` | `cards` | `cards`: a section per category with two-up feature cards and a count caption. `rows`: one card per category with a row per feature. |
| `tabs` | `true` | The Features and Roadmap folder tabs. |
| `filter` | `chips` | `chips`: pills with a count. `segmented`: a segmented control without counts. |
| `statusLabels` | `{}` | Label overrides by key: `all`, `available`, `beta`, `in_progress`, `planned`. |
| `next` | `3` | How many issues the Coming next card lists; `0` hides it. |
| `issueLabels` | `{}` | Forge label to issue status (`in_progress`, `planned`) for the badges in the Coming next card. |
| `subtitle` | `''` | Line under the title; `{count}` is the number of features, `{appVersion}` the app version. |
| `notice` | `''` | Info notice under the groups. |
| `noticeLink` | `null` | `{ text, href }`: the first occurrence of `text` (translated) in the notice becomes a link to `href`, opened in a new tab. Only `http(s)` and site-relative (`/...`) hrefs link; anything else, or no match, leaves the notice as plain text. |
| `documentationButton` | `false` | A Documentation button in the header. |
| `suggestButton` | `true` | The feature request as the header's primary button; `false` moves it into the Actions menu. |

The PqRoadmap board:

```json
{ "id": "FeaturesRoadmap", "route": "/features-roadmap", "type": "roadmap", "title": "Functies en roadmap",
  "config": {
    "documentationUrl": "https://pipelinq.conduction.nl",
    "categories": { "crm": "Basis-CRM", "contact": "Klantcontact en overheid" },
    "board": { "subtitle": "Wat Pipelinq nu doet en wat eraan komt, {count} functies",
      "issueLabels": { "in progress": "in_progress", "planned": "planned" } } } }
```

The DqFunctionaliteiten board:

```json
{ "id": "FeaturesRoadmap", "route": "/features-roadmap", "type": "roadmap", "title": "Functionaliteiten en roadmap",
  "config": {
    "documentationUrl": "https://dossiq.conduction.nl",
    "categories": { "cases": "Zaakbehandeling", "decisions": "Besluiten en termijnen", "roadmap": "Op de roadmap" },
    "board": { "layout": "rows", "tabs": false, "filter": "segmented", "next": 0,
      "statusLabels": { "all": "Alles", "available": "Stabiel" },
      "subtitle": "versie {appVersion} · bijgewerkt bij elke release",
      "notice": "Hoe dossiq zich verhoudt tot andere zaaksystemen staat in de vergelijking op conduction.nl.",
      "noticeLink": { "text": "conduction.nl", "href": "https://dossiq.conduction.nl/compare" },
      "documentationButton": true, "suggestButton": false } } }
```

:::warning Deprecated

The in-app capability comparison (`capabilityComparison` on CnFeaturesAndRoadmapView and CnFeaturesAndRoadmapPage, the `features_roadmap_capabilities` initial state key, and CnCapabilityTable) is deprecated. Publish the comparison on the app's docs site and link to it instead, as dossiq #3312 and pipelinq #2195 did. It still renders; removal waits for a major version. A development build warns once per page load when a comparison is given.

:::
