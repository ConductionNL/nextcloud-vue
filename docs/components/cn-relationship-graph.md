---
sidebar_position: 31
---

# CnRelationshipGraph

Lightweight SVG relationship graph. For surfacing entity-to-entity links — related terms, dependency chains, account → contacts. Two built-in layouts (`radial`, `grid`) plus `manual` for when consumers compose a layout engine externally.

**Not** a force-directed graph layout engine — pulling in a real layout solver is a non-goal. For dense graphs that need force-directed positioning, run a layout engine (e.g. `d3-force`, `dagre`) and pass the resulting x/y per node under `layout="manual"`.

## Try it

```vue
<CnRelationshipGraph
  title="Related terms"
  :nodes="[
    { id: 'core', label: 'Sociology', isRoot: true },
    { id: 'a',    label: 'Sociometry' },
    { id: 'b',    label: 'Demography' },
    { id: 'c',    label: 'Anthropology' },
  ]"
  :edges="[
    { source: 'core', target: 'a', label: 'subfield' },
    { source: 'core', target: 'b' },
    { source: 'core', target: 'c' },
  ]"
  @node-click="openTerm" />
```

## Layouts

| `layout` | Positioning |
|----------|-------------|
| `radial` | Root in centre, others evenly on the perimeter. |
| `grid`   | NxN grid by input order. |
| `manual` | Honour each node's `x` / `y`. |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `nodes` | `Array<{id,label?,isRoot?,colour?,radius?,x?,y?}>` | `[]` | Node list. |
| `edges` | `Array<{id?,source,target,label?,colour?,dashed?}>` | `[]` | Edge list. Unknown source/target ids drop silently. |
| `layout` | `'radial'\|'grid'\|'manual'` | `'radial'` | Layout strategy. |
| `size` | Number | `400` | SVG viewBox size (square). |
| `nodeRadius` | Number | `18` | Default node radius (px). |
| `nodeColor` / `rootColor` | String | brand defaults | Default circle fills. |
| `edgeColor` | String | `'#999'` | Default edge stroke colour. |
| `edgeWidth` | Number | `1.5` | Edge stroke width. |
| `strokeColor` | String | `'#fff'` | Node stroke colour. |
| `title` / `description` | String | `''` | Optional header. |
| `ariaLabel` | String | `'Relationship graph'` | SVG aria-label. |
| `legend` | `Array<{label,colour}>` | `[]` | Optional legend rendered below the SVG. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `node-click` | original node | Clicked node row. Resolved (positioned) coords are dropped from the payload. |
