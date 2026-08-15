# CnFeaturesAndRoadmapLink

`NcAppNavigationItem` link entry that consuming Conduction apps mount inside their
`<NcAppNavigationSettings>` slot. Navigates to the route configured by the host
app's Vue router so the user lands on the `<CnFeaturesAndRoadmapView>` two-tab
surface (Features + Roadmap) with the in-context Suggest action.

## When to use

Drop this once at the bottom of the main app navigation, just above the existing
Settings gear. Apps that have disabled the Features & Roadmap surface via the
`openregister::features_roadmap_enabled` IAppConfig key should pass
`:disabled="true"` so the entry collapses to nothing.

## Props

| Prop | Type | Required | Default | Notes |
|---|---|---|---|---|
| `routeName` (`route-name`) | String | No | `'features-roadmap'` | Vue Router name the menu entry navigates to. Host apps that register the view at a different route name pass theirs here. |
| `disabled` | Boolean | No | `false` | When `true` the component renders nothing — admin opt-out path. |
| `label` | String | No | `t('nextcloud-vue', 'Features & roadmap')` | Override the localized default label. Pass when the host app prefers different wording. |

## Backend contract

The link itself is purely UI. The downstream view this entry navigates to consumes
OpenRegister's `github-issue-proxy` capability (see
[`openregister/openspec/changes/add-features-roadmap-menu/specs/github-issue-proxy/spec.md`](https://github.com/ConductionNL/openregister/tree/development/openspec/changes/add-features-roadmap-menu/specs/github-issue-proxy)).

## Reference

- Spec: `openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md`
  → Requirement "CnFeaturesAndRoadmapLink"
- Implementation: [src/components/CnFeaturesAndRoadmapLink/CnFeaturesAndRoadmapLink.vue](../../src/components/CnFeaturesAndRoadmapLink/CnFeaturesAndRoadmapLink.vue)

The generated props/events/slots table is regenerated at build time from JSDoc on
the SFC; run `cd docusaurus && npm run prebuild:docs` to refresh
`docs/components/_generated/cn-features-and-roadmap-link.md`.
