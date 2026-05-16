# CnFeaturesAndRoadmapView

Route-level container for the Features & Roadmap surface. Renders two tabs
(`CnFeaturesTab` + `CnRoadmapTab`), a "Suggest feature" header button that opens
`CnSuggestFeatureModal`, and a single "disabled by your administrator" empty
state when the `disabled` prop is set.

## When to use

Mount this as the page component for the `/features-roadmap` route (or whatever
route name your host app registers). Pair with `<CnFeaturesAndRoadmapLink>` in
your navigation. Features data is supplied as a prop — typically generated at
build time by the `@conduction/openspec-manifest` CLI (see openregister-side
spec section 3).

## Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `repo` | String | Yes | `<owner>/<repo>` slug of the app's GitHub repository. Passed through to `CnRoadmapTab` and `CnSuggestFeatureModal`. |
| `features` | Array | Yes | Build-time feature manifest — array of `{slug, title, summary, docsUrl}` objects rendered by `CnFeaturesTab`. |
| `disabled` | Boolean | No | When `true`, the view collapses to a single "disabled by your administrator" empty state. |

## Backend contract

The Roadmap tab inside this view consumes
`GET /index.php/apps/openregister/api/github/issues?labels=enhancement,feature`
and the Suggest modal POSTs to the same endpoint. Full backend contract:
[`openregister/openspec/changes/add-features-roadmap-menu/specs/github-issue-proxy/spec.md`](https://github.com/ConductionNL/openregister/tree/development/openspec/changes/add-features-roadmap-menu/specs/github-issue-proxy).

## Reference

- Spec: `openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md`
  → Requirement "CnFeaturesAndRoadmapView"
- Implementation: [src/components/CnFeaturesAndRoadmapView/CnFeaturesAndRoadmapView.vue](../../src/components/CnFeaturesAndRoadmapView/CnFeaturesAndRoadmapView.vue)
