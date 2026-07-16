# CnFeaturesTab

Alphabetically-sorted list of capabilities the consuming app has shipped. Driven
by a `features` prop — typically the build-time `docs/features.json` emitted by
`@conduction/openspec-manifest` (openregister-side spec section 3).

## When to use

Inside `<CnFeaturesAndRoadmapView>` as the first tab. Standalone use is
supported — apps that want a Features-only page can mount this directly with
the same prop shape.

## Reference

- Spec: `openspec/changes/add-features-roadmap-menu/specs/features-roadmap-component/spec.md`
  → Requirement "CnFeaturesTab"
- Implementation: [src/components/CnFeaturesTab/CnFeaturesTab.vue](../../src/components/CnFeaturesTab/CnFeaturesTab.vue)
