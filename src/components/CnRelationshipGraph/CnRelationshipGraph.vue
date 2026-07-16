<template>
	<div class="cn-relationship-graph" data-testid="cn-relationship-graph">
		<header v-if="title || description" class="cn-relationship-graph__header">
			<h3 v-if="title" class="cn-relationship-graph__title">
				{{ title }}
			</h3>
			<p v-if="description" class="cn-relationship-graph__description">
				{{ description }}
			</p>
		</header>

		<svg :viewBox="`0 0 ${size} ${size}`"
			class="cn-relationship-graph__svg"
			:aria-label="ariaLabel"
			role="img"
			:data-layout="layout">
			<!-- Edges first so nodes render on top. -->
			<g class="cn-relationship-graph__edges">
				<line v-for="(edge, idx) in resolvedEdges"
					:key="'edge-' + idx"
					:x1="edge.x1"
					:y1="edge.y1"
					:x2="edge.x2"
					:y2="edge.y2"
					:stroke="edge.colour || edgeColor"
					:stroke-width="edgeWidth"
					:stroke-dasharray="edge.dashed ? '4 4' : ''"
					class="cn-relationship-graph__edge"
					:data-edge-id="edge.id" />
				<text v-for="(edge, idx) in resolvedEdgeLabels"
					:key="'label-' + idx"
					:x="edge.lx"
					:y="edge.ly"
					class="cn-relationship-graph__edge-label">
					{{ edge.label }}
				</text>
			</g>

			<!-- Nodes. -->
			<g class="cn-relationship-graph__nodes">
				<g v-for="node in resolvedNodes"
					:key="node.id"
					class="cn-relationship-graph__node"
					:class="{ 'cn-relationship-graph__node--root': node.isRoot }"
					:data-node-id="node.id"
					:transform="`translate(${node.x},${node.y})`"
					@click="onNodeClick(node)">
					<circle
						:r="node.radius || nodeRadius"
						:fill="node.colour || (node.isRoot ? rootColor : nodeColor)"
						:stroke="strokeColor"
						stroke-width="1.5" />
					<text
						class="cn-relationship-graph__node-label"
						text-anchor="middle"
						dominant-baseline="middle"
						:y="(node.radius || nodeRadius) + 14">
						{{ node.label || node.id }}
					</text>
				</g>
			</g>
		</svg>

		<!-- Optional legend. -->
		<ul v-if="legend.length > 0" class="cn-relationship-graph__legend">
			<li v-for="(entry, idx) in legend"
				:key="idx"
				class="cn-relationship-graph__legend-entry">
				<span class="cn-relationship-graph__legend-dot" :style="{ background: entry.colour }" />
				{{ entry.label }}
			</li>
		</ul>
	</div>
</template>

<script>
/**
 * CnRelationshipGraph — Lightweight SVG relationship graph for
 * surfacing entity-to-entity links (related terms, dependency
 * chains, account → contacts, etc.).
 *
 * Two built-in layouts:
 *
 * - `radial` (default) — one root node at the centre, every other
 *   node placed evenly around the perimeter. Best for "this term
 *   is related to N others".
 * - `grid` — nodes placed in a uniform NxN grid, ordered by input.
 *   Best for "small homogeneous cluster".
 *
 * Force-directed layout is a non-goal here (would pull in a layout
 * engine). The component is intentionally simple — consumers
 * needing real graph layout should reach for a dedicated lib and
 * compose its output into this widget via the `layout: 'manual'`
 * mode (each node carries explicit `x` / `y`).
 *
 * ```vue
 * <CnRelationshipGraph
 *   title="Related terms"
 *   :nodes="[
 *     { id: 'core', label: 'Sociology', isRoot: true },
 *     { id: 'a',    label: 'Sociometry' },
 *     { id: 'b',    label: 'Demography' },
 *     { id: 'c',    label: 'Anthropology' },
 *   ]"
 *   :edges="[
 *     { source: 'core', target: 'a', label: 'subfield' },
 *     { source: 'core', target: 'b' },
 *     { source: 'core', target: 'c' },
 *   ]"
 *   @node-click="openTerm" />
 * ```
 */
export default {
	name: 'CnRelationshipGraph',
	props: {
		/**
		 * Nodes to render. Each entry:
		 * `{ id, label?, isRoot?, colour?, radius?, x?, y? }`.
		 * `x` / `y` are only honoured under `layout: 'manual'`.
		 *
		 * @type {Array<object>}
		 */
		nodes: { type: Array, default: () => [] },
		/**
		 * Edges to render. Each entry:
		 * `{ id?, source, target, label?, colour?, dashed? }`.
		 * Edges referencing unknown node ids are silently dropped.
		 *
		 * @type {Array<object>}
		 */
		edges: { type: Array, default: () => [] },
		/**
		 * Layout strategy: `radial` (default; root at centre + others
		 * on perimeter), `grid` (uniform grid), `manual` (consumer
		 * supplies x/y per node).
		 *
		 * @type {'radial'|'grid'|'manual'}
		 */
		layout: {
			type: String,
			default: 'radial',
			validator: (v) => ['radial', 'grid', 'manual'].includes(v),
		},
		/** SVG viewBox size (square). */
		size: { type: Number, default: 400 },
		/** Default node radius (px). Each node may override via its `radius`. */
		nodeRadius: { type: Number, default: 18 },
		/** Default non-root node colour. */
		nodeColor: { type: String, default: '#0082c9' },
		/** Root-node colour. */
		rootColor: { type: String, default: '#21468b' },
		/** Default edge colour. */
		edgeColor: { type: String, default: '#999' },
		/** Default edge stroke width. */
		edgeWidth: { type: Number, default: 1.5 },
		/** Node stroke colour. */
		strokeColor: { type: String, default: '#fff' },
		/** Optional title rendered above the SVG. */
		title: { type: String, default: '' },
		/** Optional description rendered under the title. */
		description: { type: String, default: '' },
		/** ARIA label for the SVG. */
		ariaLabel: { type: String, default: 'Relationship graph' },
		/**
		 * Legend entries — `{ label, colour }` pairs rendered as a
		 * key under the SVG. Empty array hides the legend.
		 *
		 * @type {Array<{label:string,colour:string}>}
		 */
		legend: { type: Array, default: () => [] },
	},
	computed: {
		/**
		 * Pick the root node — the first entry with `isRoot: true`,
		 * else the first node.
		 *
		 * @return {object|null} The root node or null.
		 */
		rootNode() {
			if (this.nodes.length === 0) return null
			return this.nodes.find((n) => n.isRoot) || this.nodes[0]
		},
		/**
		 * Layout-computed nodes — original entries with `x` / `y`
		 * coords filled in.
		 *
		 * @return {Array<object>} Positioned nodes.
		 */
		resolvedNodes() {
			if (this.nodes.length === 0) return []
			if (this.layout === 'manual') {
				return this.nodes.map((n) => ({
					...n,
					x: typeof n.x === 'number' ? n.x : this.size / 2,
					y: typeof n.y === 'number' ? n.y : this.size / 2,
				}))
			}
			if (this.layout === 'grid') {
				const cols = Math.ceil(Math.sqrt(this.nodes.length))
				const cell = this.size / (cols + 1)
				return this.nodes.map((n, i) => ({
					...n,
					x: cell * (1 + (i % cols)),
					y: cell * (1 + Math.floor(i / cols)),
				}))
			}
			// Radial — root in middle, others on perimeter.
			const cx = this.size / 2
			const cy = this.size / 2
			const r = this.size / 2 - this.nodeRadius - 24
			const others = this.nodes.filter((n) => n !== this.rootNode)
			const step = others.length === 0 ? 0 : (Math.PI * 2) / others.length
			const out = [{ ...this.rootNode, x: cx, y: cy, isRoot: true }]
			others.forEach((n, idx) => {
				const theta = step * idx - Math.PI / 2
				out.push({
					...n,
					x: cx + Math.cos(theta) * r,
					y: cy + Math.sin(theta) * r,
				})
			})
			return out
		},
		/**
		 * Map of node id → resolved (x, y, ...) for edge lookups.
		 *
		 * @return {Record<string,object>}
		 */
		nodeMap() {
			const out = {}
			for (const n of this.resolvedNodes) out[n.id] = n
			return out
		},
		/**
		 * Edges resolved to `{ x1, y1, x2, y2, ...edge }`. Edges
		 * referencing unknown ids drop out.
		 *
		 * @return {Array<object>}
		 */
		resolvedEdges() {
			return this.edges
				.map((e) => {
					const s = this.nodeMap[e.source]
					const t = this.nodeMap[e.target]
					if (!s || !t) return null
					return { ...e, x1: s.x, y1: s.y, x2: t.x, y2: t.y }
				})
				.filter(Boolean)
		},
		/**
		 * Edges that carry a `label` — derived second time over
		 * with mid-point coordinates for text placement.
		 *
		 * @return {Array<object>}
		 */
		resolvedEdgeLabels() {
			return this.resolvedEdges
				.filter((e) => typeof e.label === 'string' && e.label.length > 0)
				.map((e) => ({ ...e, lx: (e.x1 + e.x2) / 2, ly: (e.y1 + e.y2) / 2 - 4 }))
		},
	},
	methods: {
		/**
		 * Emit `@node-click` with the original (un-positioned) node.
		 *
		 * @param {object} node The resolved (positioned) node.
		 * @return {void}
		 */
		onNodeClick(node) {
			const original = this.nodes.find((n) => n.id === node.id) || node
			/**
			 * @event node-click Emitted on node click. Payload is
			 *   the original node entry (without computed coords).
			 * @type {object}
			 */
			this.$emit('node-click', original)
		},
	},
}
</script>

<style scoped>
.cn-relationship-graph {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.cn-relationship-graph__title {
	margin: 0;
	font-size: 1.1em;
}

.cn-relationship-graph__description {
	margin: 4px 0 0;
	color: var(--color-text-maxcontrast);
}

.cn-relationship-graph__svg {
	width: 100%;
	max-width: 100%;
	height: auto;
	font-family: var(--font-face, sans-serif);
}

.cn-relationship-graph__node {
	cursor: pointer;
}

.cn-relationship-graph__node:hover circle {
	stroke-width: 3;
}

.cn-relationship-graph__node-label {
	fill: var(--color-main-text);
	font-size: 12px;
	pointer-events: none;
}

.cn-relationship-graph__edge-label {
	fill: var(--color-text-maxcontrast);
	font-size: 10px;
	pointer-events: none;
}

.cn-relationship-graph__legend {
	display: flex;
	gap: 12px;
	flex-wrap: wrap;
	margin: 0;
	padding: 0;
	list-style: none;
	font-size: 0.85em;
}

.cn-relationship-graph__legend-entry {
	display: inline-flex;
	align-items: center;
	gap: 6px;
}

.cn-relationship-graph__legend-dot {
	width: 12px;
	height: 12px;
	border-radius: 50%;
	display: inline-block;
}
</style>
