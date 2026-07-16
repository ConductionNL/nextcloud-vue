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
