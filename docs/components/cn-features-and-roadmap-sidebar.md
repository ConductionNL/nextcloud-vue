# CnFeaturesAndRoadmapSidebar

Right-edge sidebar mounted by `CnAppRoot` at NcContent level when
`CnFeaturesAndRoadmapView` publishes its hoisted-sidebar config (same
`cnIndexSidebarConfig` mechanism `CnIndexPage` uses for `CnIndexSidebar`).

The sidebar contains four pitch sections — **Suggest**, **OpenBuilt**,
**LLM**, **Support** — each with a short body and a CTA. The Suggest CTA
renders as an anchor: the hosting view always passes `suggestUrl` (the
forge's feature-request issue form by default), so the legacy `@suggest`
emit only fires on standalone mounts without a URL. The fourth "Support this project"
container emits `@support`; the parent view mounts
[`CnSupportDialog`](./cn-support-dialog.md) in response so users who
dismissed the first-open note can re-open it from the roadmap page.

## Props

| Prop | Type | Required | Notes |
|---|---|---|---|
| `openbuiltUrl` | String | Yes | Absolute URL or Nextcloud-relative path for the OpenBuilt CTA. |
| `llmSkillsUrl` | String | Yes | Absolute URL for the LLM-skills CTA (opens in a new tab). |

## Events

| Event | Payload | Notes |
|---|---|---|
| `suggest` | none | Emitted when the user clicks the Suggest CTA and no `suggestUrl` was passed (legacy path — the hosting view always passes one). |
| `support` | none | Emitted when the user clicks the "Show support note" CTA in the fourth (Support) container. Parent should mount [`CnSupportDialog`](./cn-support-dialog.md); `CnFeaturesAndRoadmapView` wires this automatically. |

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
