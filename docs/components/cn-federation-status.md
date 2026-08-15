---
sidebar_position: 27
---

# CnFederationStatus

Federation-status widget. Renders an aggregate summary (counts per
`up` / `degraded` / `down` / `unknown`) plus a per-node list with
status dot, URL, last-checked timestamp, and click-emit for
drilldown. Status strings are normalised so consumers don't need an
exhaustive enum.

## Try it

```vue
<CnFederationStatus
  title="Federation directory"
  description="Live availability across the federation."
  :nodes="nodes"
  @node-click="openNodeDetail" />
```

```js
const nodes = [
  { id: 'a', name: 'Node A', url: 'https://a.example.org', status: 'up' },
  { id: 'b', name: 'Node B', url: 'https://b.example.org', status: 'degraded', message: 'High latency' },
  { id: 'c', name: 'Node C', url: 'https://c.example.org', status: 'down', lastChecked: '2026-05-20T11:00:00Z' },
]
```

## Status normalisation

| Input strings | Normalised to | Colour |
|---------------|---------------|--------|
| `up`, `online`, `ok`, `healthy`, `available` | `up` | `--color-success` |
| `degraded`, `partial`, `slow`, `warning` | `degraded` | `--color-warning` |
| `down`, `offline`, `error`, `failed`, `unhealthy` | `down` | `--color-error` |
| anything else | `unknown` | `--color-text-maxcontrast` |

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `nodes` | `Array<{id?,name?,url?,status,message?,lastChecked?}>` | `[]` | Nodes to render. |
| `title` | String | `''` | Optional widget heading. |
| `description` | String | `''` | Optional widget description. |
| `hideSummary` | Boolean | `false` | Hide the aggregate count row. |
| `upLabel` / `degradedLabel` / `downLabel` / `unknownLabel` | String | `'up'` / `'degraded'` / `'down'` / `'unknown'` | Status-chip / row labels. |
| `emptyLabel` | String | `'No federation nodes registered.'` | Empty-state text. |
| `lastCheckedLabel` | String | `'Last checked'` | Prefix for the per-node last-checked timestamp. |
| `sort` | `'status'\|'name'\|'none'` | `'status'` | Per-node sort. Status order: down → degraded → unknown → up. |

## Events

| Event | Payload | Description |
|-------|---------|-------------|
| `node-click` | `node` | Clicked node, original shape. |
