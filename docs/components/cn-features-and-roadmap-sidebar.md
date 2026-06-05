# CnFeaturesAndRoadmapSidebar

Right-edge sidebar mounted by `CnAppRoot` at NcContent level when
`CnFeaturesAndRoadmapView` publishes its hoisted-sidebar config (same
`cnIndexSidebarConfig` mechanism `CnIndexPage` uses for `CnIndexSidebar`).

The sidebar contains three pitch sections — **Suggest**, **OpenBuilt**,
**LLM** — each with a short body and a CTA. The Suggest CTA emits a
`@suggest` event; the parent view binds that to its `openSuggestModal`
method so a single `CnSuggestFeatureModal` serves the header CTA + the
sidebar text-CTA.

## Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `openbuiltUrl` | String | Yes | Absolute URL or Nextcloud-relative path for the OpenBuilt CTA. |
| `llmSkillsUrl` | String | Yes | Absolute URL for the LLM-skills CTA (opens in a new tab). |

## Events

| Event | Payload | Notes |
|---|---|---|
| `suggest` | none | Emitted when the user clicks the Suggest CTA inside the sidebar. Parent should open the `CnSuggestFeatureModal`. |

## Mounted via the hoisted-sidebar pattern

This component is **not** rendered inline by `CnFeaturesAndRoadmapView`.
Instead, the view publishes a config object to the `cnIndexSidebarConfig`
provide (set up by `CnAppRoot`):

```js
this.cnIndexSidebarConfig.value = {
  component: CnFeaturesAndRoadmapSidebar,
  props: { openbuiltUrl, llmSkillsUrl },
  listeners: { suggest: () => this.openSuggestModal() },
}
```

`CnAppRoot` renders the component as a sibling of `NcAppContent` — the
only spot where Nextcloud's right-edge sidebar slot positions correctly.

## Reference

- Spec: `openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md`
  → Requirement "CnFeaturesAndRoadmapSidebar"
- Implementation: [src/components/CnFeaturesAndRoadmapSidebar/CnFeaturesAndRoadmapSidebar.vue](../../src/components/CnFeaturesAndRoadmapSidebar/CnFeaturesAndRoadmapSidebar.vue)
- Mounting view: [src/components/CnFeaturesAndRoadmapView/CnFeaturesAndRoadmapView.vue](../../src/components/CnFeaturesAndRoadmapView/CnFeaturesAndRoadmapView.vue) — see `publishHoistedSidebar()`

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `suggestUrl` | String | `''` | Optional override target for the "Suggest a feature" CTA. When set, the CTA links there (external URLs open in a new tab); when empty it emits `@suggest` for the in-product modal. |
