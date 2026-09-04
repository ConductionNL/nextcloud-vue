# CnFeaturesAndRoadmapView

Route-level container for the Features & Roadmap surface. Body is a card
grid (Features OR Roadmap). Header carries three buttons: the view-toggle
("Show roadmap" / "Show features"), the info-sidebar toggle ("Show info"
/ "Hide info"), and the primary "+ Suggest feature" CTA. The info sidebar
is a slide-in `NcAppSidebar` with three pitch sections: suggest a feature,
tweak the app in OpenBuilt, and let an LLM ship the feature using the
Conduction skill set. The admin-disabled empty state collapses everything
to a single "disabled by administrator" notice.

## When to use

Mount this as the page component for the `/features-roadmap` route (or
whatever route name your host app registers). Pair with
`<CnFeaturesAndRoadmapLink>` in your navigation. Features data is supplied
as a prop — typically read at runtime from `docs/features.json`, which the
org-wide Features Extract workflow stage regenerates from
`openspec/specs/` (see ADR-033).

The view defaults to **Features**. The view-toggle switches to **Roadmap**
and back; the page title (`Features` / `Roadmap`) reflects the active
view. The sidebar starts closed; the info toggle opens it as a right-edge
slide-in panel. Roadmap cards are fully clickable — anywhere on the card
opens the corresponding issue in a new tab.

## Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `repo` | String | Yes | `<owner>/<repo>` slug of the app's repository on the forge. Passed through to `CnRoadmapTab` and used to build the Suggest CTA's feature-request form link. |
| `forge` | Object | No | `{ type, baseUrl? }` target forge the feature-request deep-links are built against (the Suggest CTA and the support dialog's feature-request URL). |
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
    "repo": "Conduction/<appid>",
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

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `suggestUrl` | String | `''` | Optional override for the "Suggest a feature" CTA target. |
| `documentationUrl` | String | `''` | Per-app documentation site URL shown in the docs info card. |
| `appName` | String | `''` | Human app name used in the feature-request copy. |
| `appSlug` | String | `''` | App slug used to build the feature-request deep-link repo. |
| `appStoreUrl` | String | `''` | Nextcloud app-store URL for the app. |
| `featureRequestUrl` | String | `''` | Explicit feature-request URL override. |
| `donateUrl` | String | `''` | Donation/support link. |
| `supportUrl` | String | `''` | Support contact link. |
| `founderName` | String | `''` | Founder name shown in the personal-touch copy. |
| `founderTitle` | String | `''` | Founder title/role shown alongside the name. |
