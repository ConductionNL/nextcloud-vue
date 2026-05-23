# CnFeaturesAndRoadmapView

Route-level container for the Features & Roadmap surface. Renders a card
grid (Features OR Roadmap) with a state-aware toggle button in the header,
two Suggest-feature CTAs (header + sidebar), a sidebar with OpenBuilt and
LLM-skills pitch blocks, and the admin-disabled empty state.

## When to use

Mount this as the page component for the `/features-roadmap` route (or
whatever route name your host app registers). Pair with
`<CnFeaturesAndRoadmapLink>` in your navigation. Features data is supplied
as a prop — typically read at runtime from `docs/features.json`, which the
org-wide Features Extract workflow stage regenerates from
`openspec/specs/` (see ADR-033).

The view defaults to **Features**. The header toggle button switches to
**Roadmap** and back; the page title (`Features` / `Roadmap`) reflects the
active view.

## Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `repo` | String | Yes | `<owner>/<repo>` slug of the app's GitHub repository. Passed through to `CnRoadmapTab` and `CnSuggestFeatureModal`. |
| `features` | Array | Yes | Build-time feature manifest — array of `{slug, title, summary, docsUrl}` objects rendered by `CnFeaturesTab`. |
| `disabled` | Boolean | No | When `true`, the view collapses to a single "disabled by your administrator" empty state. |
| `openbuiltUrl` | String | No | Override the OpenBuilt sidebar CTA target. Pass an absolute URL or a Nextcloud-relative path. Defaults to the in-instance OpenBuilt route at `/apps/openbuilt` (resolved via `generateUrl`). |
| `llmSkillsUrl` | String | No | Override the LLM-skills sidebar CTA target. Defaults to `https://docs.conduction.nl/ai-skills`. |

## Manifest usage

The library's `roadmap` page type wires this view automatically. One
manifest entry replaces the per-app wrapper + `customComponents.js`
registration + `type: "custom"` declaration the older pattern required:

```json
{
  "id": "FeaturesRoadmap",
  "route": "/features-roadmap",
  "type": "roadmap",
  "title": "Features & roadmap",
  "config": {
    "repo": "ConductionNL/<appid>",
    "features": [],
    "disabled": false
  }
}
```

`config.repo`, `config.features`, and `config.disabled` are forwarded
verbatim as props. Per-app `loadState` resolution of either repo or
features (for admin-configurable / build-extracted values) is the
consumer's responsibility — supply the resolved values through `config.*`
before passing the manifest to `CnAppRoot` (e.g. mutate the bundled
manifest in `main.js`).

## Backend contract

The Roadmap view inside this component consumes
`GET /index.php/apps/openregister/api/github/issues?labels=enhancement,feature`
and the Suggest modal POSTs to the same endpoint. Full backend contract:
[`openregister/openspec/changes/add-features-roadmap-menu/specs/github-issue-proxy/spec.md`](https://github.com/ConductionNL/openregister/tree/development/openspec/changes/add-features-roadmap-menu/specs/github-issue-proxy).

## Reference

- Spec: `openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md`
  → Requirement "CnFeaturesAndRoadmapView"
- Implementation: [src/components/CnFeaturesAndRoadmapView/CnFeaturesAndRoadmapView.vue](../../src/components/CnFeaturesAndRoadmapView/CnFeaturesAndRoadmapView.vue)
