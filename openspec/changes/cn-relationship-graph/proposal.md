# CnRelationshipGraph — lightweight SVG relationship graph

## Why

The opencatalogi triage flagged `GlossaryDetailPageView` as a custom because no lib widget surfaces a related-terms graph. The shape recurs for "this entity links to N others" displays without needing a full force-directed layout engine.

## What

`src/components/CnRelationshipGraph/CnRelationshipGraph.vue` (~280 LOC). SVG nodes + edges with two built-in layouts (`radial`, `grid`) plus `manual` mode for consumer-supplied positions. Click-emits the original node. Optional edge labels + legend.

## Non-goals

- Force-directed layout — consumers run `d3-force` etc. externally and feed positions via `layout: 'manual'`.
- Pan / zoom — SVG transforms are consumer-side.
- Multi-edge / curved edges.

## References

- [nextcloud-vue#291](https://codeberg.org/Conduction/nextcloud-vue/issues/291).
- opencatalogi `GlossaryDetailPageView`.
